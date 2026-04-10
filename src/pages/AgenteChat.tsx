import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAgentById } from "@/data/agents";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agente`;

async function streamChat({
  messages,
  agentId,
  onDelta,
  onDone,
  signal,
}: {
  messages: Msg[];
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

export default function AgenteChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = getAgentById(agentId || "");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const send = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg: Msg = { role: "user", content: text };
    setInput("");
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

  return (
    <div className="flex flex-col h-[calc(100svh-3rem)] max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 py-4 px-1 border-b border-border/40">
        <Link to="/agentes">
          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-base shrink-0">
          {agent.emoji}
        </div>
        <div>
          <p className="text-sm font-bold text-foreground leading-tight">{agent.name}</p>
          <p className="text-[11px] text-primary font-medium">{agent.title}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-6 px-1 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-2xl">
              {agent.emoji}
            </div>
            <p className="text-sm font-semibold text-foreground">
              Olá! Eu sou a {agent.name} ✨
            </p>
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              {agent.description} Como posso te ajudar hoje?
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "gradient-hero text-white rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-headings:my-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border/40 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2 bg-secondary/60 rounded-2xl p-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Pergunte algo para a ${agent.name}...`}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm px-2 py-2 outline-none placeholder:text-muted-foreground/60 max-h-32"
            style={{ fieldSizing: "content" } as any}
          />
          <Button
            onClick={send}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-xl h-9 w-9 shrink-0 gradient-hero border-0 text-white shadow-soft disabled:opacity-30"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
