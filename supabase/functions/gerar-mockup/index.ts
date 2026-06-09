import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function findBase64Image(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["b64_json", "partial_image_b64", "image_b64", "base64"]) {
    const found = record[key];
    if (typeof found === "string") return found.startsWith("data:image") ? found.split(",")[1] : found;
  }
  for (const nested of Object.values(record)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const found = findBase64Image(item);
        if (found) return found;
      }
    } else if (nested && typeof nested === "object") {
      const found = findBase64Image(nested);
      if (found) return found;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { arteImageUrl, moldeName, temaNome, nome, formato, quality: qualityRaw } = await req.json();

    if (!arteImageUrl || !moldeName || !temaNome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: arteImageUrl, moldeName, temaNome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quality = qualityRaw === "low" ? "low" : qualityRaw === "high" ? "high" : "medium";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const formatoDesc = formato === "story"
      ? "formato vertical 9:16 para Stories do Instagram"
      : "formato quadrado 1:1 para Feed do Instagram";

    const prompt = `Crie uma foto realista de produto para divulgação em redes sociais (${formatoDesc}).

PRODUTO: Uma ${moldeName} montada e pronta, personalizada com o tema "${temaNome}" para "${nome || "festa"}".

A IMAGEM DEVE MOSTRAR:
- A ${moldeName} MONTADA (3D, como produto finalizado, NÃO planificada)
- Decorada com o tema "${temaNome}" — cores, padrões e elementos do tema
- O nome "${nome}" visível na caixinha
- Ambientação de mesa de festa com itens decorativos do tema ao fundo (balões, doces, confetes)
- Iluminação profissional, suave e convidativa
- Estilo de foto de produto para Instagram — clean, bonita, vendedora

NÃO incluir: textos sobrepostos, watermarks, molduras, logos.`;

    const size = formato === "story" ? "1024x1536" : "1024x1024";

    const openaiRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        size,
        n: 1,
        quality,
        stream: true,
        partial_images: 2,
      }),
    });

    if (!openaiRes.ok || !openaiRes.body) {
      const errText = await openaiRes.text().catch(() => "");
      console.error("OpenAI error:", openaiRes.status, errText);
      const status = openaiRes.status === 429 ? 429 : 500;
      const msg =
        openaiRes.status === 429
          ? "Muitas requisições. Aguarde alguns segundos."
          : `Erro no serviço de IA: ${openaiRes.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstreamCT = openaiRes.headers.get("content-type") || "";
    const isSSE = upstreamCT.includes("text/event-stream");
    console.log("OpenAI upstream content-type:", upstreamCT, "isSSE:", isSSE);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const finalizeAndUpload = async (
      b64: string,
      writer: WritableStreamDefaultWriter<Uint8Array>,
      encoder: TextEncoder,
    ) => {
      try {
        const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileName = `mockup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const filePath = `public/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("artes-geradas")
          .upload(filePath, bytes, { contentType: "image/png", upsert: false });
        if (upErr) { console.error("upload error:", upErr); return; }
        const { data: pub } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
        const meta = {
          type: "meta.uploaded",
          mockupUrl: pub.publicUrl,
          mockupBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
        };
        await writer.write(encoder.encode(`event: meta.uploaded\ndata: ${JSON.stringify(meta)}\n\n`));
      } catch (e) {
        console.error("upload step error:", e);
      }
    };

    if (!isSSE) {
      const json = await openaiRes.json().catch((e) => {
        console.error("Failed to parse OpenAI JSON:", e);
        return null;
      });
      const b64: string | undefined = json?.data?.[0]?.b64_json;
      if (!b64) {
        console.error("OpenAI non-SSE response had no b64_json:", JSON.stringify(json).slice(0, 500));
        return new Response(
          JSON.stringify({ error: "A IA não retornou o mockup. Tente novamente." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      (async () => {
        try {
          const evt = { type: "image_generation.completed", b64_json: b64, created_at: Date.now() };
          await writer.write(encoder.encode(`event: image_generation.completed\ndata: ${JSON.stringify(evt)}\n\n`));
          await finalizeAndUpload(b64, writer, encoder);
        } finally {
          try { await writer.close(); } catch {}
        }
      })();
      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "X-Accel-Buffering": "no",
        },
      });
    }

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = openaiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalB64: string | null = null;
      let lastB64: string | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          await writer.write(value);
          buf += decoder.decode(value, { stream: true });
          let match;
          while ((match = buf.match(/\r?\n\r?\n/))) {
            const block = buf.slice(0, match.index);
            buf = buf.slice((match.index ?? 0) + match[0].length);
            let evt = "";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) evt = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (evt.includes("image_generation") && data) {
              try {
                const b64 = findBase64Image(JSON.parse(data));
                if (b64) {
                  lastB64 = b64;
                  if (evt.includes("completed") || evt.includes("final")) finalB64 = b64;
                }
              } catch {}
            }
          }
        }
        const imageToUpload = finalB64 || lastB64;
        if (imageToUpload) await finalizeAndUpload(imageToUpload, writer, encoder);
        else console.error("SSE stream ended without any image event");
      } catch (e) {
        console.error("stream pump error:", e);
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("gerar-mockup error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
