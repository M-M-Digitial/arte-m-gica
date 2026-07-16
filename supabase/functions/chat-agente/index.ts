import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.102.1";
import { buildAgentInstructions, canonicalAgentId, type AgentId } from "./agent-config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";
const MAX_MESSAGES = 24;
const MAX_MESSAGE_CHARS = 8_000;
const MAX_TOTAL_CHARS = 48_000;
const MAX_IMAGES = 4;
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

type UserSupabase = ReturnType<typeof createClient>;

interface Attachment {
  path: string;
  name: string;
  mimeType: string;
  url: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  images: Attachment[];
  audio?: Attachment;
  transcript?: string;
}

interface ChatSource {
  title: string;
  url: string;
}

interface Citation extends ChatSource {
  startIndex?: number;
  endIndex?: number;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function isTrustedAttachmentUrl(value: string, supabaseUrl: string) {
  try {
    const candidate = new URL(value);
    const project = new URL(supabaseUrl);
    return (
      candidate.protocol === "https:" &&
      candidate.host === project.host &&
      candidate.pathname.startsWith("/storage/v1/object/sign/chat-uploads/")
    );
  } catch {
    return false;
  }
}

function parseAttachment(
  value: unknown,
  userId: string,
  supabaseUrl: string,
  expectedType: "image" | "audio",
): Attachment {
  if (!value || typeof value !== "object") throw new Error("Anexo inválido.");
  const candidate = value as Record<string, unknown>;
  const path = safeString(candidate.path, 500);
  const name = safeString(candidate.name, 200) || "anexo";
  const mimeType = safeString(candidate.mimeType, 100).toLowerCase();
  const url = safeString(candidate.url, 2_000);

  if (!path.startsWith(`${userId}/`) || path.includes("..")) {
    throw new Error("O anexo não pertence a esta conta.");
  }
  if (!isTrustedAttachmentUrl(url, supabaseUrl)) throw new Error("URL de anexo inválida.");
  if (expectedType === "image" && !mimeType.startsWith("image/")) throw new Error("Imagem inválida.");
  if (expectedType === "audio" && !mimeType.startsWith("audio/")) throw new Error("Áudio inválido.");

  return { path, name, mimeType, url };
}

function parseMessages(input: unknown, userId: string, supabaseUrl: string): ChatMessage[] {
  if (!Array.isArray(input) || input.length === 0) throw new Error("Envie ao menos uma mensagem.");
  if (input.length > MAX_MESSAGES) throw new Error("A conversa excedeu o limite de contexto.");

  let totalChars = 0;
  const messages = input.map((value) => {
    if (!value || typeof value !== "object") throw new Error("Mensagem inválida.");
    const candidate = value as Record<string, unknown>;
    if (candidate.role !== "user" && candidate.role !== "assistant") throw new Error("Papel de mensagem inválido.");

    const content = safeString(candidate.content, MAX_MESSAGE_CHARS);
    const transcript = safeString(candidate.transcript, MAX_MESSAGE_CHARS);
    totalChars += content.length + transcript.length;

    const rawImages = Array.isArray(candidate.images) ? candidate.images : [];
    if (rawImages.length > MAX_IMAGES) throw new Error(`Envie no máximo ${MAX_IMAGES} imagens por mensagem.`);
    const images = candidate.role === "user"
      ? rawImages.map((image) => parseAttachment(image, userId, supabaseUrl, "image"))
      : [];
    const audio = candidate.role === "user" && candidate.audio
      ? parseAttachment(candidate.audio, userId, supabaseUrl, "audio")
      : undefined;

    if (!content && !transcript && images.length === 0 && !audio) throw new Error("Mensagem vazia.");
    return { role: candidate.role, content, images, audio, transcript } as ChatMessage;
  });

  if (totalChars > MAX_TOTAL_CHARS) throw new Error("A conversa ficou muito longa. Inicie uma nova conversa.");
  if (messages.at(-1)?.role !== "user") throw new Error("A última mensagem deve ser da usuária.");
  return messages;
}

async function authenticate(req: Request, supabaseUrl: string, anonKey: string) {
  const authorization = req.headers.get("Authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7).trim() : "";
  if (!token) return null;

  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { client, user: data.user };
}

async function hasActiveAccess(client: UserSupabase, userId: string) {
  const [{ data: roles, error: rolesError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    client.from("user_roles").select("role").eq("user_id", userId),
    client.from("assinaturas").select("status, valid_until").maybeSingle(),
  ]);
  if (rolesError || subscriptionError) {
    console.error("Access verification failed", rolesError?.code, subscriptionError?.code);
    throw new Error("Não foi possível validar o acesso agora.");
  }

  const isAdmin = Array.isArray(roles) && roles.some((row: { role: string }) => row.role === "admin");
  if (isAdmin) return true;
  if (!subscription || subscription.status !== "active") return false;
  return !subscription.valid_until || new Date(subscription.valid_until).getTime() > Date.now();
}

async function transcribeAudio(attachment: Attachment, openAIKey: string, signal: AbortSignal) {
  const fileResponse = await fetch(attachment.url, { signal });
  if (!fileResponse.ok) throw new Error("Não foi possível abrir o áudio enviado.");
  const contentLength = Number(fileResponse.headers.get("content-length") ?? "0");
  if (contentLength > MAX_AUDIO_BYTES) throw new Error("O áudio deve ter no máximo 20 MB.");

  const bytes = await fileResponse.arrayBuffer();
  if (bytes.byteLength > MAX_AUDIO_BYTES) throw new Error("O áudio deve ter no máximo 20 MB.");

  const form = new FormData();
  form.append("file", new Blob([bytes], { type: attachment.mimeType }), attachment.name);
  form.append("model", "gpt-4o-mini-transcribe");
  form.append("language", "pt");
  form.append("response_format", "json");

  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey}` },
    body: form,
    signal,
  });
  if (!response.ok) {
    console.error("OpenAI transcription failed", response.status, response.headers.get("x-request-id"));
    throw new Error("Não consegui transcrever este áudio. Tente gravar novamente.");
  }
  const data = await response.json();
  const transcript = safeString(data.text, MAX_MESSAGE_CHARS);
  if (!transcript) throw new Error("O áudio não contém fala reconhecível.");
  return transcript;
}

function buildOpenAIInput(messages: ChatMessage[]) {
  return messages.map((message) => {
    if (message.role === "assistant") return { role: "assistant", content: message.content };

    const text = [message.content, message.transcript ? `Transcrição do áudio:\n${message.transcript}` : ""]
      .filter(Boolean)
      .join("\n\n");
    const content: Array<Record<string, unknown>> = [];
    if (text) content.push({ type: "input_text", text });
    for (const image of message.images) {
      content.push({ type: "input_image", image_url: image.url, detail: "auto" });
    }
    return { role: "user", content };
  });
}

async function loadMemory(client: UserSupabase, userId: string, agentId: AgentId) {
  const { data, error } = await client
    .from("agent_memories")
    .select("agent_id, summary, facts")
    .eq("user_id", userId)
    .in("agent_id", ["shared", agentId]);

  if (error) {
    console.warn("Agent memory unavailable", error.code);
    return "";
  }
  if (!data?.length) return "";
  return data
    .map((item: { agent_id: string; summary: string; facts: unknown }) =>
      `[${item.agent_id}]\nResumo: ${safeString(item.summary, 5_000)}\nFatos: ${JSON.stringify(item.facts ?? [])}`,
    )
    .join("\n\n");
}

function responseOutputText(response: Record<string, unknown> | null) {
  if (!response || !Array.isArray(response.output)) return "";
  const chunks: string[] = [];
  for (const item of response.output as Array<Record<string, unknown>>) {
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content as Array<Record<string, unknown>>) {
      if (part.type === "output_text" && typeof part.text === "string") chunks.push(part.text);
    }
  }
  return chunks.join("");
}

function citationUrl(value: unknown) {
  const rawUrl = safeString(value, 2_000);
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function citationTitle(value: unknown, url: string) {
  const explicitTitle = safeString(value, 300);
  if (explicitTitle) return explicitTitle;
  try {
    return new URL(url).host;
  } catch {
    return "Fonte consultada";
  }
}

function collectCitations(response: Record<string, unknown> | null) {
  const citations: Citation[] = [];
  if (!response || !Array.isArray(response.output)) return citations;

  for (const item of response.output as Array<Record<string, unknown>>) {
    if (item.type === "web_search_call") {
      const action = item.action as Record<string, unknown> | undefined;
      if (Array.isArray(action?.sources)) {
        for (const source of action.sources as Array<Record<string, unknown>>) {
          const url = citationUrl(source.url);
          if (url) citations.push({ title: citationTitle(source.title, url), url });
        }
      }
    }

    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content as Array<Record<string, unknown>>) {
      if (!Array.isArray(part.annotations)) continue;
      for (const rawAnnotation of part.annotations as Array<Record<string, unknown>>) {
        if (rawAnnotation.type !== "url_citation") continue;
        const nested = rawAnnotation.url_citation as Record<string, unknown> | undefined;
        const annotation = nested ?? rawAnnotation;
        const url = citationUrl(annotation.url);
        if (!url) continue;
        citations.push({
          title: citationTitle(annotation.title, url),
          url,
          startIndex: typeof annotation.start_index === "number" ? annotation.start_index : undefined,
          endIndex: typeof annotation.end_index === "number" ? annotation.end_index : undefined,
        });
      }
    }
  }
  return citations;
}

function uniqueSources(citations: Citation[]): ChatSource[] {
  const seen = new Set<string>();
  const sources: ChatSource[] = [];
  for (const citation of citations) {
    if (seen.has(citation.url)) continue;
    seen.add(citation.url);
    sources.push({ title: citation.title, url: citation.url });
    if (sources.length === 8) break;
  }
  return sources;
}

function addInlineCitationLinks(text: string, citations: Citation[], sources: ChatSource[]) {
  if (!text || citations.length === 0) return text;
  let result = text;
  const withIndexes = citations
    .filter((citation) => typeof citation.endIndex === "number")
    .sort((a, b) => (b.endIndex ?? 0) - (a.endIndex ?? 0));

  for (const citation of withIndexes) {
    if (result.includes(`](${citation.url})`)) continue;
    const sourceIndex = sources.findIndex((source) => source.url === citation.url);
    if (sourceIndex < 0) continue;
    const start = Math.max(0, Math.min(citation.startIndex ?? citation.endIndex ?? 0, result.length));
    const end = Math.max(start, Math.min(citation.endIndex ?? start, result.length));
    const marker = `[${sourceIndex + 1}](${citation.url})`;
    const annotatedText = result.slice(start, end);
    if (annotatedText.includes("cite") || annotatedText.includes("")) {
      result = `${result.slice(0, start)}${marker}${result.slice(end)}`;
    } else {
      result = `${result.slice(0, end)} ${marker}${result.slice(end)}`;
    }
  }
  return result;
}

async function updateMemory(
  client: UserSupabase,
  userId: string,
  agentId: AgentId,
  existingMemory: string,
  messages: ChatMessage[],
  assistantText: string,
  openAIKey: string,
) {
  const recent = messages.slice(-8).map((message) => ({
    role: message.role,
    content: [message.content, message.transcript].filter(Boolean).join("\n").slice(0, 3_000),
  }));
  const response = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${openAIKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_MEMORY_MODEL") ?? "gpt-5.4-mini",
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 900,
      instructions: `Atualize memória durável de um ateliê brasileiro. Guarde somente fatos úteis declarados pela própria usuária sobre o negócio, como produtos, cidade, tom da marca, equipamentos, custos, capacidade e preferências. Não guarde nomes, telefone, endereço, data de evento ou qualquer dado pessoal de clientes terceiros. Não invente nem transforme hipótese em fato. Resumos devem ser curtos e fatos devem ser frases independentes.`,
      input: JSON.stringify({
        agent_id: agentId,
        existing_memory: existingMemory,
        recent_messages: recent,
        assistant_response: assistantText.slice(0, 4_000),
      }),
      text: {
        format: {
          type: "json_schema",
          name: "agent_memory",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              shared_summary: { type: "string" },
              shared_facts: { type: "array", items: { type: "string" } },
              agent_summary: { type: "string" },
              agent_facts: { type: "array", items: { type: "string" } },
            },
            required: ["shared_summary", "shared_facts", "agent_summary", "agent_facts"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.warn("Memory extraction failed", response.status, response.headers.get("x-request-id"));
    return;
  }
  const body = await response.json();
  const text = responseOutputText(body as Record<string, unknown>);
  if (!text) return;

  const parsed = JSON.parse(text) as Record<string, unknown>;
  const toFacts = (value: unknown) =>
    (Array.isArray(value) ? value : []).map((item) => safeString(item, 500)).filter(Boolean).slice(0, 24);
  const now = new Date().toISOString();
  const rows = [
    {
      user_id: userId,
      agent_id: "shared",
      summary: safeString(parsed.shared_summary, 5_000),
      facts: toFacts(parsed.shared_facts),
      updated_at: now,
    },
    {
      user_id: userId,
      agent_id: agentId,
      summary: safeString(parsed.agent_summary, 5_000),
      facts: toFacts(parsed.agent_facts),
      updated_at: now,
    },
  ];
  const { error } = await client.from("agent_memories").upsert(rows, { onConflict: "user_id,agent_id" });
  if (error) console.warn("Memory persistence failed", error.code);
}

function scheduleBackground(promise: Promise<unknown>) {
  const runtime = globalThis as typeof globalThis & { EdgeRuntime?: { waitUntil: (task: Promise<unknown>) => void } };
  if (runtime.EdgeRuntime?.waitUntil) runtime.EdgeRuntime.waitUntil(promise);
  else void promise.catch((error) => console.warn("Background task failed", error));
}

function currentDateInBrazil() {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "full",
  }).format(new Date());
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const openAIKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !anonKey) return jsonResponse({ error: "Serviço temporariamente indisponível." }, 503);
  if (!openAIKey) return jsonResponse({ error: "A OpenAI ainda não foi configurada no servidor." }, 503);

  const auth = await authenticate(req, supabaseUrl, anonKey);
  if (!auth) return jsonResponse({ error: "Sua sessão expirou. Entre novamente." }, 401);

  try {
    if (!(await hasActiveAccess(auth.client, auth.user.id))) {
      return jsonResponse({ error: "Seu acesso ao Meu Ateliê Digital não está ativo." }, 403);
    }
  } catch {
    return jsonResponse({ error: "Não foi possível validar seu acesso agora. Tente novamente." }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Corpo da requisição inválido." }, 400);
  }

  const agentId = canonicalAgentId(body.agentId);
  if (!agentId) return jsonResponse({ error: "Agente não encontrada." }, 404);

  let messages: ChatMessage[];
  try {
    messages = parseMessages(body.messages, auth.user.id, supabaseUrl);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Mensagem inválida." }, 400);
  }

  let transcript = "";
  const latestMessage = messages.at(-1)!;
  if (latestMessage.audio && !latestMessage.transcript) {
    try {
      transcript = await transcribeAudio(latestMessage.audio, openAIKey, req.signal);
      latestMessage.transcript = transcript;
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : "Erro ao transcrever áudio." }, 422);
    }
  }

  const memory = await loadMemory(auth.client, auth.user.id, agentId);
  const instructions = buildAgentInstructions(agentId, memory, currentDateInBrazil());
  const openAIResponse = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAIKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("OPENAI_CHAT_MODEL") ?? "gpt-5.4-mini",
      store: false,
      stream: true,
      reasoning: { effort: "low" },
      max_output_tokens: 2_500,
      instructions,
      input: buildOpenAIInput(messages),
      tools: [
        {
          type: "web_search",
          user_location: { type: "approximate", country: "BR" },
        },
      ],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
    }),
    signal: req.signal,
  });

  if (!openAIResponse.ok || !openAIResponse.body) {
    console.error("OpenAI response failed", openAIResponse.status, openAIResponse.headers.get("x-request-id"));
    if (openAIResponse.status === 429) {
      return jsonResponse({ error: "Muitas solicitações ao mesmo tempo. Aguarde um instante e tente novamente." }, 429);
    }
    if (openAIResponse.status === 401 || openAIResponse.status === 403) {
      return jsonResponse({ error: "A conexão com a OpenAI precisa ser revisada." }, 503);
    }
    return jsonResponse({ error: "A assistente não conseguiu responder agora. Tente novamente." }, 502);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      if (transcript) send({ type: "transcript", text: transcript });

      const reader = openAIResponse.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";
      let completedResponse: Record<string, unknown> | null = null;
      let researching = false;
      let streamError = "";

      const processData = (raw: string) => {
        if (!raw || raw === "[DONE]") return;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(raw);
        } catch {
          return;
        }
        const type = typeof event.type === "string" ? event.type : "";
        if (type === "response.output_text.delta" && typeof event.delta === "string") {
          streamedText += event.delta;
          send({ type: "delta", delta: event.delta });
        } else if (type.includes("web_search_call") && !researching) {
          researching = true;
          send({ type: "status", status: "researching" });
        } else if (type === "response.completed" && event.response && typeof event.response === "object") {
          completedResponse = event.response as Record<string, unknown>;
        } else if (type === "error" || type === "response.failed") {
          const error = event.error as Record<string, unknown> | undefined;
          streamError = safeString(error?.message, 500) || "A OpenAI interrompeu a resposta.";
        }
      };

      try {
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

        if (streamError) throw new Error(streamError);
        const finalText = responseOutputText(completedResponse) || streamedText;
        if (!finalText) throw new Error("A assistente retornou uma resposta vazia.");
        const citations = collectCitations(completedResponse);
        const sources = uniqueSources(citations);
        const displayText = addInlineCitationLinks(finalText, citations, sources);
        if (displayText !== streamedText) send({ type: "replace", content: displayText });
        if (sources.length) send({ type: "sources", sources });
        send({ type: "done" });

        scheduleBackground(
          updateMemory(auth.client, auth.user.id, agentId, memory, messages, finalText, openAIKey).catch((error) =>
            console.warn("Memory update failed", error instanceof Error ? error.message : "unknown"),
          ),
        );
      } catch (error) {
        console.error("OpenAI stream failed", error instanceof Error ? error.message : "unknown");
        send({ type: "error", error: "A resposta foi interrompida. Tente enviar novamente." });
      } finally {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
});
