import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// O mockup roda como job em background na OpenAI (Responses API): o "start"
// cria o job e devolve o id; o front consulta "status" até a imagem ficar
// pronta. Mesmo modelo do gerar-arte — nenhuma conexão fica presa esperando.

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isModerationError = (text: string) =>
  /moderation_blocked|content_policy|safety/i.test(text);

async function handleStart(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const { arteImageUrl, moldeName, temaNome, nome, formato, quality: qualityRaw } = body as Record<string, any>;

  if (!arteImageUrl || !moldeName || !temaNome) {
    return jsonResponse({ error: "Campos obrigatórios: arteImageUrl, moldeName, temaNome" }, 400);
  }

  const quality = qualityRaw === "low" ? "low" : qualityRaw === "high" ? "high" : "medium";

  const formatoDesc = formato === "story"
    ? "formato vertical 9:16 para Stories do Instagram"
    : "formato quadrado 1:1 para Feed do Instagram";

  const prompt = `Crie uma foto realista de produto para divulgação em redes sociais (${formatoDesc}).

PRODUTO: Uma ${moldeName} montada e pronta, personalizada com o tema "${temaNome}" para "${nome || "festa"}".

A imagem anexa é a ARTE OFICIAL do produto (molde planificado) — use as MESMAS cores, padrões, ilustrações e o mesmo lettering dela.

A IMAGEM DEVE MOSTRAR:
- A ${moldeName} MONTADA (3D, como produto finalizado, NÃO planificada)
- Decorada exatamente com a arte anexa aplicada nas faces
- O nome "${nome}" visível na caixinha
- Ambientação de mesa de festa com itens decorativos do tema ao fundo (balões, doces, confetes)
- Iluminação profissional, suave e convidativa
- Estilo de foto de produto para Instagram — clean, bonita, vendedora

NÃO incluir: textos sobrepostos, watermarks, molduras, logos.`;

  const size = formato === "story" ? "1024x1536" : "1024x1024";

  const content: Array<Record<string, unknown>> = [{ type: "input_text", text: prompt }];
  if (typeof arteImageUrl === "string" && /^(https?:|data:image)/.test(arteImageUrl)) {
    content.push({ type: "input_image", image_url: arteImageUrl });
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      background: true,
      store: true,
      input: [{ role: "user", content }],
      tools: [{ type: "image_generation", model: "gpt-image-2", size, quality, moderation: "low" }],
      tool_choice: { type: "image_generation" },
    }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("OpenAI create error:", res.status, txt);
    if (res.status === 429) {
      return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos." }, 429);
    }
    return jsonResponse({ error: `Erro no serviço de IA: ${res.status}` }, 500);
  }

  const job = await res.json();
  if (!job?.id) {
    console.error("OpenAI create sem id:", JSON.stringify(job).slice(0, 400));
    return jsonResponse({ error: "A IA não iniciou o mockup. Tente novamente." }, 500);
  }

  console.log("Mockup job criado:", job.id, "status:", job.status);
  return jsonResponse({ jobId: job.id });
}

async function handleStatus(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!/^resp_[a-zA-Z0-9_-]+$/.test(jobId)) {
    return jsonResponse({ error: "jobId inválido" }, 400);
  }

  const res = await fetch(`https://api.openai.com/v1/responses/${jobId}`, {
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    console.error("OpenAI poll error:", res.status, txt);
    return jsonResponse({ error: `Erro ao consultar o mockup: ${res.status}` }, 500);
  }
  const job = await res.json();

  if (job.status === "queued" || job.status === "in_progress") {
    return jsonResponse({ status: "processing" });
  }

  if (job.status !== "completed") {
    const errText = JSON.stringify(job.error ?? job.incomplete_details ?? {});
    console.error("Mockup job não completou:", job.status, errText);
    if (isModerationError(errText)) {
      return jsonResponse({
        status: "error",
        error: "A OpenAI bloqueou este mockup por segurança. Tente outro tema ou nome.",
        code: "OPENAI_MODERATION_BLOCKED",
      });
    }
    return jsonResponse({ status: "error", error: "A IA não conseguiu gerar o mockup. Tente novamente." });
  }

  const call = (job.output ?? []).find((o: Record<string, unknown>) => o.type === "image_generation_call");
  const b64 = typeof call?.result === "string" ? call.result : null;
  if (!b64) {
    console.error("Mockup completou sem imagem:", JSON.stringify((job.output ?? []).map((o: Record<string, unknown>) => o.type)));
    return jsonResponse({ status: "error", error: "A IA não retornou o mockup. Tente novamente." });
  }

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileName = `mockup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = `public/${fileName}`;
  const { error: upErr } = await supabase.storage
    .from("artes-geradas")
    .upload(filePath, bytes, { contentType: "image/png", upsert: false });
  if (upErr) {
    console.error("upload error:", upErr);
    return jsonResponse({
      status: "done",
      mockupUrl: null,
      mockupBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
    });
  }
  const { data: pub } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
  return jsonResponse({
    status: "done",
    mockupUrl: pub.publicUrl,
    mockupBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "status") {
      return await handleStatus(body, OPENAI_API_KEY);
    }
    return await handleStart(body, OPENAI_API_KEY);
  } catch (error) {
    console.error("gerar-mockup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
