import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2, ImagePlus, Mic, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentById, Agent } from "@/data/agents";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type MessageContent = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agente`;

async function streamChat({
  messages,
  agentId,
  onDelta,
  onDone,
  signal,
}: {
  messages: MessageContent[];
  agentId: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, agentId }),
    signal,
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${resp.status}`);
  }

  if (!resp.body) throw new Error("Sem resposta do servidor");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") { onDone(); return; }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  onDone();
}

async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from("chat-uploads")
    .upload(path, file);

  if (error) throw new Error("Erro ao enviar arquivo: " + error.message);

  const { data } = supabase.storage
    .from("chat-uploads")
    .getPublicUrl(path);

  return data.publicUrl;
}

// ── Suggestions per agent ──
const agentSuggestions: Record<string, string[]> = {
  nina: ["Como responder quando pedem desconto?", "Monte uma mensagem de boas-vindas", "Como fechar pedido pelo WhatsApp?"],
  jade: ["Calcule o preço de 50 caixinhas", "Como cobrar taxa de urgência?", "Qual margem de lucro ideal?"],
  luna: ["Crie um checklist de briefing", "Quais perguntas fazer à cliente?", "Monte um formulário de pedido"],
  flora: ["Organize minha fila de produção", "Crie um checklist de produção", "Como evitar atrasos?"],
  iris: ["Crie uma campanha de Dia das Mães", "Monte um combo promocional", "Ideias para Black Friday"],
  clara: ["Crie uma legenda para post de caixinha", "Analise meu perfil do Instagram", "Ideias de reels para papelaria"],
  violeta: ["Organize meu catálogo por categorias", "Crie descrições para meus produtos", "Monte uma vitrine digital"],
  sofia: ["Mensagem de pós-venda criativa", "Como pedir indicação?", "Crie um programa de fidelidade simples"],
  malu: ["Calcule meu lucro neste pedido", "Como calcular ticket médio?", "Quais produtos dão mais lucro?"],
  bella: ["Qual papel usar para caixinhas?", "Dicas de laminação", "Como configurar a impressora?"],
  elisa: ["Revise este pedido para mim", "Checklist antes de produzir", "O que conferir antes de entregar?"],
  maia: ["Organize meus pedidos da semana", "Quais pedidos são urgentes?", "Como recusar prazo impossível?"],
};

export default function AgenteChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = getAgentById(agentId || "");
  const [messages, setMessages] = useState<MessageContent[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestions = agent ? (agentSuggestions[agent.id] || []) : [];

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Agente não encontrado</p>
        <Link to="/agentes">
          <Button variant="outline" className="rounded-full">Voltar</Button>
        </Link>
      </div>
    );
  }

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if ((!text && pendingImages.length === 0) || isLoading) return;

    // Upload pending images
    let imageUrls: string[] = [];
    if (pendingImages.length > 0) {
      try {
        imageUrls = await Promise.all(pendingImages.map((p) => uploadFile(p.file)));
      } catch (e: any) {
        toast.error(e.message);
        return;
      }
    }

    const userMsg: MessageContent = {
      role: "user",
      content: text || "Analise esta imagem",
      images: imageUrls.length > 0 ? imageUrls : undefined,
    };

    setInput("");
    setPendingImages([]);
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
          );
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        agentId: agent.id,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
      });
    } catch (e: any) {
      console.error(e);
      setIsLoading(false);
      toast.error(e.message || "Erro ao enviar mensagem");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPendingImages((prev) => [...prev, ...newImages].slice(0, 4));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `audio-${Date.now()}.webm`, { type: "audio/webm" });

        try {
          const url = await uploadFile(file);
          const audioMsg: MessageContent = {
            role: "user",
            content: `[Áudio enviado](${url}) — por favor, analise o contexto e me ajude.`,
          };
          setMessages((prev) => [...prev, audioMsg]);
          setIsLoading(true);

          let assistantSoFar = "";
          const upsertAssistant = (chunk: string) => {
            assistantSoFar += chunk;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          };

          await streamChat({
            messages: [...messages, audioMsg],
            agentId: agent.id,
            onDelta: upsertAssistant,
            onDone: () => setIsLoading(false),
          });
        } catch (e: any) {
          toast.error("Erro ao enviar áudio");
          setIsLoading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast.error("Permissão de microfone negada");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-[calc(100svh-3rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 border-b border-border/40 bg-background/80 glass">
        <Link to="/agentes">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-base shrink-0">
          {agent.emoji}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground leading-tight truncate">{agent.name}</p>
          <p className="text-[11px] text-primary font-medium truncate">{agent.title}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-12 pb-8 gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl">
                {agent.emoji}
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-foreground">
                  Olá! Eu sou a {agent.name} ✨
                </p>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  {agent.description}
                </p>
              </div>

              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="flex flex-wrap justify-center gap-2 pt-4 max-w-lg">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => send(s)}
                      className="text-xs px-4 py-2.5 rounded-full border border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm shrink-0 mt-1">
                  {agent.emoji}
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${msg.role === "user" ? "order-first" : ""}`}>
                {/* Images */}
                {msg.images && msg.images.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.images.map((url, j) => (
                      <img
                        key={j}
                        src={url}
                        alt="Imagem enviada"
                        className="rounded-xl max-h-48 max-w-[200px] object-cover shadow-card cursor-pointer"
                        onClick={() => window.open(url, "_blank")}
                      />
                    ))}
                  </div>
                )}

                {/* Text */}
                {msg.content && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "gradient-hero text-white rounded-tr-md ml-auto"
                        : "bg-secondary/70 text-foreground rounded-tl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-lg gradient-hero flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-1">
                  Eu
                </div>
              )}
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center text-sm shrink-0">
                {agent.emoji}
              </div>
              <div className="bg-secondary/70 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-border/40 bg-background">
        <div className="max-w-2xl mx-auto px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {/* Pending images preview */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative group">
                  <img
                    src={img.preview}
                    alt="Preview"
                    className="h-16 w-16 rounded-xl object-cover border border-border/40"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recording indicator */}
          {isRecording && (
            <div className="flex items-center gap-3 mb-3 px-3 py-2 rounded-xl bg-destructive/10 text-destructive text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
              Gravando {formatTime(recordingTime)}
              <button
                onClick={stopRecording}
                className="ml-auto h-8 w-8 rounded-full bg-destructive text-white flex items-center justify-center hover:bg-destructive/90 transition-colors"
              >
                <Square className="h-3 w-3 fill-current" />
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-end gap-2 bg-secondary/50 rounded-2xl p-1.5 border border-border/40 focus-within:border-primary/30 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />

            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9 shrink-0 text-muted-foreground hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isRecording}
            >
              <ImagePlus className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className={`rounded-xl h-9 w-9 shrink-0 transition-colors ${
                isRecording
                  ? "text-destructive hover:text-destructive"
                  : "text-muted-foreground hover:text-primary"
              }`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
            >
              {isRecording ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
            </Button>

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Mensagem para ${agent.name}...`}
              rows={1}
              disabled={isRecording}
              className="flex-1 bg-transparent resize-none text-sm px-2 py-2 outline-none placeholder:text-muted-foreground/50 max-h-32 disabled:opacity-50"
              style={{ fieldSizing: "content" } as any}
            />

            <Button
              onClick={() => send()}
              disabled={(!input.trim() && pendingImages.length === 0) || isLoading || isRecording}
              size="icon"
              className="rounded-xl h-9 w-9 shrink-0 gradient-hero border-0 text-white shadow-soft disabled:opacity-30"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
            As respostas são geradas por IA e podem conter imprecisões.
          </p>
        </div>
      </div>
    </div>
  );
}
