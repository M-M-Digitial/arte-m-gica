import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  History,
  ImagePlus,
  Loader2,
  Mic,
  Search,
  Send,
  ShieldCheck,
  Square,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { AgentIcon } from "@/components/AgentIcon";
import { ConversasList } from "@/components/ConversasList";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAgentById, type AgentId } from "@/data/agents";
import { useAuth } from "@/hooks/use-auth";
import { useConversas } from "@/hooks/use-conversas";
import { supabase } from "@/integrations/supabase/client";
import type { ChatAttachment, ChatMessage, ChatSource } from "@/types/chat";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-agente`;
const CHAT_BUCKET = "chat-uploads";
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

interface StreamHandlers {
  onDelta: (text: string) => void;
  onReplace: (text: string) => void;
  onSources: (sources: ChatSource[]) => void;
  onTranscript: (text: string) => void;
  onStatus: (status: string) => void;
}

function storedAttachment(attachment: ChatAttachment): ChatAttachment {
  return {
    path: attachment.path,
    name: attachment.name,
    mimeType: attachment.mimeType,
  };
}

function serializeMessages(messages: ChatMessage[]) {
  return messages.map((message) => ({
    ...message,
    images: message.images?.map(storedAttachment),
    audio: message.audio ? storedAttachment(message.audio) : undefined,
  }));
}

function mimeTypeFromName(name: string, fallback: "image" | "audio") {
  const extension = name.split(".").pop()?.toLowerCase();
  const known: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    webm: "audio/webm",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    wav: "audio/wav",
    ogg: "audio/ogg",
  };
  return (extension && known[extension]) || `${fallback}/*`;
}

function pathFromStorageUrl(value: string) {
  try {
    const pathname = decodeURIComponent(new URL(value).pathname);
    const marker = "/chat-uploads/";
    const index = pathname.indexOf(marker);
    return index >= 0 ? pathname.slice(index + marker.length) : "";
  } catch {
    return "";
  }
}

function normalizeAttachment(value: unknown, fallback: "image" | "audio"): ChatAttachment | null {
  if (typeof value === "string") {
    const path = pathFromStorageUrl(value);
    const name = path.split("/").pop() || `${fallback}-antigo`;
    return path ? { path, name, mimeType: mimeTypeFromName(name, fallback), url: value } : null;
  }
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.path !== "string" || !candidate.path) return null;
  const name = typeof candidate.name === "string" && candidate.name
    ? candidate.name
    : candidate.path.split("/").pop() || "anexo";
  return {
    path: candidate.path,
    name,
    mimeType: typeof candidate.mimeType === "string" ? candidate.mimeType : mimeTypeFromName(name, fallback),
    url: typeof candidate.url === "string" ? candidate.url : undefined,
  };
}

async function hydrateMessages(rawMessages: ChatMessage[], userId: string) {
  const normalized = rawMessages.map((rawMessage) => {
    const message = rawMessage as unknown as Record<string, unknown>;
    const images = Array.isArray(message.images)
      ? message.images.map((image) => normalizeAttachment(image, "image")).filter(Boolean) as ChatAttachment[]
      : [];
    const audio = normalizeAttachment(message.audio, "audio") ?? undefined;
    return {
      role: message.role === "assistant" ? "assistant" : "user",
      content: typeof message.content === "string" ? message.content : "",
      transcript: typeof message.transcript === "string" ? message.transcript : undefined,
      sources: Array.isArray(message.sources) ? message.sources as unknown as ChatSource[] : undefined,
      images: images.length ? images : undefined,
      audio,
    } as ChatMessage;
  });

  const ownedPaths = Array.from(new Set(
    normalized.flatMap((message) => [
      ...(message.images ?? []).map((image) => image.path),
      ...(message.audio ? [message.audio.path] : []),
    ]).filter((path) => path.startsWith(`${userId}/`)),
  ));
  if (ownedPaths.length === 0) return normalized;

  const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(ownedPaths, SIGNED_URL_TTL_SECONDS);
  if (error) {
    console.error("Erro ao assinar anexos", error);
    return normalized;
  }
  const signedUrls = new Map(data.map((item) => [item.path, item.signedUrl]));
  return normalized.map((message) => ({
    ...message,
    images: message.images?.map((image) => ({ ...image, url: signedUrls.get(image.path) ?? image.url })),
    audio: message.audio
      ? { ...message.audio, url: signedUrls.get(message.audio.path) ?? message.audio.url }
      : undefined,
  }));
}

async function prepareMessagesForRequest(messages: ChatMessage[], userId: string) {
  const ownedPaths = Array.from(new Set(
    messages.flatMap((message) => [
      ...(message.images ?? []).map((image) => image.path),
      ...(message.audio ? [message.audio.path] : []),
    ]).filter((path) => path.startsWith(`${userId}/`)),
  ));
  const signedUrls = new Map<string, string>();
  if (ownedPaths.length) {
    const { data, error } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(ownedPaths, SIGNED_URL_TTL_SECONDS);
    if (error) throw new Error("Não foi possível abrir os anexos. Envie-os novamente.");
    for (const item of data) {
      if (item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }

  return messages.map((message) => ({
    ...message,
    images: message.images
      ?.filter((image) => image.path.startsWith(`${userId}/`) && signedUrls.has(image.path))
      .map((image) => ({ ...image, url: signedUrls.get(image.path) })),
    audio: message.audio?.path.startsWith(`${userId}/`) && signedUrls.has(message.audio.path)
      ? { ...message.audio, url: signedUrls.get(message.audio.path) }
      : undefined,
  }));
}

async function uploadFile(file: File, userId: string): Promise<ChatAttachment> {
  const rawExtension = file.name.split(".").pop()?.toLowerCase() || (file.type.startsWith("audio/") ? "webm" : "bin");
  const extension = rawExtension.replace(/[^a-z0-9]/g, "").slice(0, 10) || "bin";
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error(`Erro ao enviar ${file.name}: ${error.message}`);
  const { data, error: signError } = await supabase.storage
    .from(CHAT_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (signError) throw new Error("O arquivo foi enviado, mas não pôde ser aberto.");
  return { path, name: file.name, mimeType: file.type, url: data.signedUrl };
}

async function streamChat(
  messages: ChatMessage[],
  agentId: AgentId,
  accessToken: string,
  handlers: StreamHandlers,
  signal: AbortSignal,
) {
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ messages, agentId }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Erro ${response.status}`);
  }
  if (!response.body) throw new Error("O servidor não iniciou a resposta.");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const processData = (raw: string) => {
    if (!raw || raw === "[DONE]") return;
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }
    if (event.type === "delta" && typeof event.delta === "string") handlers.onDelta(event.delta);
    if (event.type === "replace" && typeof event.content === "string") handlers.onReplace(event.content);
    if (event.type === "transcript" && typeof event.text === "string") handlers.onTranscript(event.text);
    if (event.type === "status" && typeof event.status === "string") handlers.onStatus(event.status);
    if (event.type === "sources" && Array.isArray(event.sources)) {
      handlers.onSources(event.sources as unknown as ChatSource[]);
    }
    if (event.type === "error") throw new Error(typeof event.error === "string" ? event.error : "A resposta foi interrompida.");
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let lineEnd = buffer.indexOf("\n");
    while (lineEnd >= 0) {
      const line = buffer.slice(0, lineEnd).replace(/\r$/, "");
      buffer = buffer.slice(lineEnd + 1);
      if (line.startsWith("data:")) processData(line.slice(5).trim());
      lineEnd = buffer.indexOf("\n");
    }
  }
  if (buffer.startsWith("data:")) processData(buffer.slice(5).trim());
}

export default function AgenteChat() {
  const { agentId: routeAgentId = "" } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const agent = getAgentById(routeAgentId);
  const { session, user } = useAuth();
  const {
    conversas,
    activeId,
    setActiveId,
    loading: conversasLoading,
    createConversa,
    saveMessages,
    deleteConversa,
  } = useConversas(agent?.id ?? "");

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("Analisando seu pedido...");
  const [pendingImages, setPendingImages] = useState<Array<{ file: File; preview: string }>>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [currentConversaId, setCurrentConversaId] = useState<string | null>(null);
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null);

  const messagesScrollRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const currentConversaIdRef = useRef<string | null>(null);
  const recordingTimeRef = useRef(0);
  const pendingImagesRef = useRef<Array<{ file: File; preview: string }>>([]);
  const submitAudioRef = useRef<(attachment: ChatAttachment) => Promise<void>>(async () => undefined);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    currentConversaIdRef.current = currentConversaId;
  }, [currentConversaId]);

  useEffect(() => {
    pendingImagesRef.current = pendingImages;
  }, [pendingImages]);

  useEffect(() => {
    if (messages.length === 0) return;
    const scrollContainer = messagesScrollRef.current;
    scrollContainer?.scrollTo({ top: scrollContainer.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    if (!activeId || activeId === currentConversaId || isLoading || !user) return;
    const conversa = conversas.find((item) => item.id === activeId);
    if (!conversa) return;
    let cancelled = false;
    hydrateMessages(conversa.messages, user.id).then((hydrated) => {
      if (cancelled) return;
      setMessages(hydrated);
      messagesRef.current = hydrated;
      setCurrentConversaId(conversa.id);
      currentConversaIdRef.current = conversa.id;
      setShowHistory(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeId, conversas, currentConversaId, isLoading, user]);

  useEffect(() => () => {
    abortRef.current?.abort();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
  }, []);

  const setConversationId = useCallback((id: string | null) => {
    currentConversaIdRef.current = id;
    setCurrentConversaId(id);
    setActiveId(id);
  }, [setActiveId]);

  const runAgent = useCallback(async (baseMessages: ChatMessage[], conversaId: string | null) => {
    if (!user || !session?.access_token || !agent) throw new Error("Sua sessão expirou. Entre novamente.");
    const requestMessages = await prepareMessagesForRequest(baseMessages, user.id);
    let workingMessages = requestMessages;
    let assistantContent = "";
    let sources: ChatSource[] = [];
    const controller = new AbortController();
    abortRef.current = controller;

    const render = () => {
      const next = assistantContent
        ? [...workingMessages, { role: "assistant", content: assistantContent, sources } as ChatMessage]
        : workingMessages;
      messagesRef.current = next;
      setMessages(next);
    };

    try {
      await streamChat(
        requestMessages,
        agent.id,
        session.access_token,
        {
          onDelta: (delta) => {
            assistantContent += delta;
            render();
          },
          onReplace: (content) => {
            assistantContent = content;
            render();
          },
          onSources: (nextSources) => {
            sources = nextSources;
            render();
          },
          onTranscript: (transcript) => {
            workingMessages = workingMessages.map((message, index) =>
              index === workingMessages.length - 1 ? { ...message, transcript } : message,
            );
            render();
          },
          onStatus: (nextStatus) => {
            setStatus(nextStatus === "researching" ? "Pesquisando em fontes públicas..." : "Preparando a resposta...");
          },
        },
        controller.signal,
      );
      if (!assistantContent) throw new Error("A assistente não retornou conteúdo. Tente novamente.");
    } finally {
      abortRef.current = null;
      const finalMessages = assistantContent
        ? [...workingMessages, { role: "assistant", content: assistantContent, sources } as ChatMessage]
        : workingMessages;
      messagesRef.current = finalMessages;
      setMessages(finalMessages);
      if (conversaId) {
        await saveMessages(conversaId, serializeMessages(finalMessages));
      }
    }
  }, [agent, saveMessages, session?.access_token, user]);

  const submitUserMessage = useCallback(async (userMessage: ChatMessage) => {
    const baseMessages = [...messagesRef.current, userMessage];
    messagesRef.current = baseMessages;
    setMessages(baseMessages);
    let conversaId = currentConversaIdRef.current;
    const title = userMessage.content || (userMessage.audio ? "Áudio enviado" : "Imagem enviada");

    try {
      if (!conversaId) {
        const conversa = await createConversa(title);
        if (conversa) {
          conversaId = conversa.id;
          setConversationId(conversa.id);
        }
      }
      if (conversaId) await saveMessages(conversaId, serializeMessages(baseMessages));
    } catch (error) {
      console.error("Erro ao salvar conversa", error);
      toast.error("A conversa não pôde ser salva, mas você ainda pode receber a resposta.");
    }

    await runAgent(baseMessages, conversaId);
  }, [createConversa, runAgent, saveMessages, setConversationId]);

  useEffect(() => {
    submitAudioRef.current = async (attachment) => {
      await submitUserMessage({
        role: "user",
        content: "Ouça este áudio e me ajude com o pedido.",
        audio: attachment,
      });
    };
  }, [submitUserMessage]);

  const send = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if ((!text && pendingImages.length === 0) || isLoading || isRecording || !user) return;
    setIsLoading(true);
    setStatus(pendingImages.length ? "Enviando imagens com segurança..." : "Analisando seu pedido...");

    try {
      const images = pendingImages.length
        ? await Promise.all(pendingImages.map((pending) => uploadFile(pending.file, user.id)))
        : [];
      pendingImages.forEach((pending) => URL.revokeObjectURL(pending.preview));
      setPendingImages([]);
      setInput("");
      await submitUserMessage({
        role: "user",
        content: text || "Analise estas imagens e me diga o que devo fazer.",
        images: images.length ? images : undefined,
      });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Erro ao enviar a mensagem.");
      }
    } finally {
      setIsLoading(false);
      setStatus("Analisando seu pedido...");
    }
  }, [input, isLoading, isRecording, pendingImages, submitUserMessage, user]);

  const startNewChat = () => {
    abortRef.current?.abort();
    messagesRef.current = [];
    setMessages([]);
    setConversationId(null);
    setShowHistory(false);
    setIsLoading(false);
  };

  const handleDeleteConversa = async (id: string) => {
    try {
      await deleteConversa(id);
      if (currentConversaIdRef.current === id) startNewChat();
    } catch {
      toast.error("Não foi possível excluir esta conversa.");
    }
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const valid = selected.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} não é uma imagem válida.`);
        return false;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error(`${file.name} ultrapassa o limite de 8 MB.`);
        return false;
      }
      return true;
    });
    setPendingImages((previous) => {
      const available = Math.max(0, 4 - previous.length);
      const next = valid.slice(0, available).map((file) => ({ file, preview: URL.createObjectURL(file) }));
      if (valid.length > available) toast.error("Você pode enviar até quatro imagens por mensagem.");
      return [...previous, ...next];
    });
    event.target.value = "";
  };

  const removeImage = (index: number) => {
    setPendingImages((previous) => {
      URL.revokeObjectURL(previous[index].preview);
      return previous.filter((_, itemIndex) => itemIndex !== index);
    });
  };

  const startRecording = async () => {
    if (isLoading || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Este navegador não oferece gravação de áudio.");
      return;
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = mediaStream;
      const preferredType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "";
      const recorder = preferredType ? new MediaRecorder(mediaStream, { mimeType: preferredType }) : new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (!blob.size || !user) return;
        setIsLoading(true);
        setStatus("Transcrevendo seu áudio...");
        try {
          const extension = mimeType.includes("ogg") ? "ogg" : "webm";
          const file = new File([blob], `audio-${Date.now()}.${extension}`, { type: mimeType.split(";")[0] });
          const attachment = await uploadFile(file, user.id);
          await submitAudioRef.current(attachment);
        } catch (error) {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            toast.error(error instanceof Error ? error.message : "Não foi possível enviar o áudio.");
          }
        } finally {
          setIsLoading(false);
          setStatus("Analisando seu pedido...");
        }
      };
      recorder.start(500);
      recordingTimeRef.current = 0;
      setRecordingTime(0);
      setIsRecording(true);
      timerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
        if (recordingTimeRef.current >= 300 && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 1_000);
    } catch {
      toast.error("Permita o uso do microfone para enviar um áudio.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  const stopGeneration = () => {
    abortRef.current?.abort();
    setStatus("Resposta interrompida.");
  };

  const copyResponse = async (index: number, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedMessage(index);
    window.setTimeout(() => setCopiedMessage(null), 1_500);
  };

  const formatTime = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;

  if (!agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Agente não encontrada.</p>
        <Link to="/agentes"><Button variant="outline">Voltar aos agentes</Button></Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100svh-3rem)] overflow-hidden">
      {showHistory && (
        <aside className="absolute inset-y-0 left-0 z-30 w-[min(20rem,88vw)] overflow-y-auto border-r border-border bg-background p-3 shadow-lg md:relative md:z-auto md:w-72 md:shadow-none">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-bold text-foreground">Histórico da {agent.name}</p>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={() => setShowHistory(false)} aria-label="Fechar histórico">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ConversasList
            conversas={conversas}
            activeId={currentConversaId}
            onSelect={setActiveId}
            onNew={startNewChat}
            onDelete={handleDeleteConversa}
            loading={conversasLoading}
          />
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center gap-3 border-b border-border/60 bg-background/95 px-3 py-3 md:px-5">
          {/* Na conversa: a seta volta pra própria agente (nova conversa); sem conversa: volta pra lista */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-md"
            aria-label={messages.length > 0 || currentConversaId ? `Voltar para a ${agent.name}` : "Voltar aos agentes"}
            onClick={() => {
              if (messages.length > 0 || currentConversaId) startNewChat();
              else navigate("/agentes");
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <AgentIcon agentId={agent.id} className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">{agent.name}</p>
            <p className="truncate text-[11px] font-medium text-primary">{agent.title}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-md text-muted-foreground"
                onClick={() => setShowHistory((visible) => !visible)}
                aria-label="Abrir histórico"
              >
                <History className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Histórico</TooltipContent>
          </Tooltip>
        </header>

        <main ref={messagesScrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-3 py-6 md:px-6">
            {messages.length === 0 && (
              <section className="mx-auto flex max-w-xl flex-col items-center py-8 text-center md:py-14">
                <AgentIcon agentId={agent.id} className="h-14 w-14" iconClassName="h-6 w-6" />
                <h1 className="mt-4 text-xl font-bold text-foreground">Olá, eu sou a {agent.name}</h1>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{agent.description}</p>
                <div className="mt-6 grid w-full gap-2 sm:grid-cols-3">
                  {agent.starters.map((starter) => (
                    <button
                      key={starter}
                      type="button"
                      onClick={() => send(starter)}
                      disabled={isLoading}
                      className="min-h-20 rounded-lg border border-border bg-card px-3 py-3 text-left text-xs leading-relaxed text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {messages.map((message, index) => (
              <article key={`${index}-${message.role}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <AgentIcon agentId={agent.id} className="mt-1 h-8 w-8" />}
                <div className={`min-w-0 max-w-[88%] md:max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                  {message.images?.length ? (
                    <div className="mb-2 grid grid-cols-2 gap-2">
                      {message.images.map((image) => image.url ? (
                        <img
                          key={image.path}
                          src={image.url}
                          alt={image.name}
                          className="aspect-square w-full rounded-lg border border-border object-cover"
                        />
                      ) : null)}
                    </div>
                  ) : null}
                  {message.audio?.url && (
                    <audio controls preload="metadata" src={message.audio.url} className="mb-2 h-10 max-w-full" aria-label="Áudio enviado" />
                  )}
                  <div
                    className={message.role === "user"
                      ? "rounded-lg bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground"
                      : "rounded-lg border border-border/70 bg-card px-4 py-3 text-sm leading-relaxed text-foreground"}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none break-words prose-headings:mb-2 prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-a:text-primary">
                        <ReactMarkdown
                          components={{
                            a: ({ ...props }) => <a {...props} target="_blank" rel="noreferrer noopener" />,
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                    {message.transcript && (
                      <div className={`mt-3 border-t pt-3 text-xs ${message.role === "user" ? "border-white/20 text-white/85" : "border-border text-muted-foreground"}`}>
                        <span className="font-semibold">Transcrição:</span> {message.transcript}
                      </div>
                    )}
                    {message.role === "assistant" && message.sources?.length ? (
                      <div className="mt-4 border-t border-border pt-3">
                        <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                          <ShieldCheck className="h-3.5 w-3.5" /> Fontes consultadas
                        </p>
                        <div className="space-y-1.5">
                          {message.sources.map((source, sourceIndex) => (
                            <a
                              key={`${source.url}-${sourceIndex}`}
                              href={source.url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="flex items-start gap-1.5 text-xs text-primary hover:underline"
                            >
                              <span>{sourceIndex + 1}. {source.title}</span>
                              <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  {message.role === "assistant" && message.content && (
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        title="Copiar resposta"
                        aria-label="Copiar resposta"
                        onClick={() => copyResponse(index, message.content)}
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        {copiedMessage === index ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground" role="status">
                <AgentIcon agentId={agent.id} className="h-8 w-8" />
                {status.includes("Pesquisando") ? <Search className="h-4 w-4 animate-pulse text-primary" /> : <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                <span>{status}</span>
              </div>
            )}
          </div>
        </main>

        <footer className="border-t border-border/60 bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 md:px-5">
          <div className="mx-auto max-w-3xl">
            {pendingImages.length > 0 && (
              <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
                {pendingImages.map((pending, index) => (
                  <div key={pending.preview} className="relative h-16 w-16 shrink-0">
                    <img src={pending.preview} alt="Imagem selecionada" className="h-full w-full rounded-lg border border-border object-cover" />
                    <button
                      type="button"
                      aria-label="Remover imagem"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {isRecording && (
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-destructive" role="status">
                <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                Gravando {formatTime(recordingTime)} de 5:00
              </div>
            )}

            <div className="flex items-end gap-2 rounded-lg border border-border bg-card p-2 focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-md text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isRecording || pendingImages.length >= 4}
                    aria-label="Anexar imagens"
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Anexar imagens</TooltipContent>
              </Tooltip>

              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 8_000))}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={`Peça ajuda à ${agent.name}...`}
                rows={1}
                disabled={isLoading || isRecording}
                className="max-h-32 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1 py-2 text-sm leading-5 text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 shrink-0 rounded-md ${isRecording ? "text-destructive" : "text-muted-foreground"}`}
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isLoading}
                    aria-label={isRecording ? "Parar gravação" : "Gravar áudio"}
                  >
                    {isRecording ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isRecording ? "Parar gravação" : "Gravar áudio"}</TooltipContent>
              </Tooltip>

              {isLoading ? (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9 shrink-0 rounded-md"
                  onClick={stopGeneration}
                  aria-label="Interromper resposta"
                  title="Interromper resposta"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-md"
                  onClick={() => send()}
                  disabled={!input.trim() && pendingImages.length === 0}
                  aria-label="Enviar mensagem"
                  title="Enviar mensagem"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
              Confira valores, datas e dados da cliente antes de usar a resposta.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
