import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PNG } from "https://esm.sh/pngjs@7.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizeTheme = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const protectedThemeAlternatives: Array<[RegExp, string]> = [
  [/minnie|mickey/, "tema clássico com laços, poás, luvas brancas e paleta vermelha, preta e branca"],
  [/barbie/, "tema fashion em tons de rosa, passarela, laços, estrelas e acessórios de moda"],
  [/frozen/, "tema reino de gelo com flocos de neve, cristais, azul claro e brilho prateado"],
  [/encanto/, "tema jardim latino colorido com flores tropicais, borboletas e arquitetura artesanal"],
  [/patrulha/, "tema cachorrinhos aventureiros com escudos, patinhas, veículos e cores primárias"],
  [/aranha|vingadores|batman|herois/, "tema super-herói genérico com cidade, raios, estrelas, máscaras e ação em quadrinhos"],
  [/carros|hot\s*wheels/, "tema corrida com pistas, bandeiras quadriculadas, troféus e cores vibrantes"],
  [/sonic/, "tema velocidade arcade com anéis, raios, trilhas dinâmicas e azul vibrante"],
  [/stitch/, "tema espacial tropical com estrelas, flores havaianas e criatura alienígena fofa genérica"],
  [/monica|cocomelon|pocoyo|baby\s*shark|peppa|mundo\s*bita|galinha/, "tema musical colorido com formas geométricas, notas musicais, arco-íris e animais fofos genéricos"],
  [/hello\s*kitty/, "tema gatinho kawaii com laços, corações, flores pequenas e tons pastel"],
  [/moana/, "tema ilha tropical com ondas, flores, folhas, sol e textura artesanal"],
  [/rapunzel|princesas/, "tema conto de fadas com coroa, castelo, flores delicadas e brilho dourado"],
  [/dragon\s*ball|naruto/, "tema mangá de ação com energia, nuvens estilizadas, raios e composição dinâmica"],
  [/minecraft/, "tema mundo de blocos pixelados com grama, ferramentas e padrão quadriculado"],
  [/bob\s*esponja/, "tema fundo do mar com bolhas, corais, estrelas-do-mar e amarelo alegre"],
  [/toy\s*story/, "tema brinquedos retrô com estrelas, nuvens, cowboy, espaço e cores primárias"],
  [/snoopy/, "tema cachorrinho cartoon com patinhas, casinha, nuvens e traços minimalistas"],
];

const getSafeThemeDescription = (temaNome: string) => {
  const normalized = normalizeTheme(temaNome);
  const alt = protectedThemeAlternatives.find(([p]) => p.test(normalized));
  return alt
    ? alt[1]
    : `${temaNome}, reinterpretado como tema decorativo genérico sem marcas, personagens licenciados ou pessoas reais`;
};

function compositeMoldLines(templateBytes: Uint8Array, generatedBytes: Uint8Array): Uint8Array {
  const tpl = PNG.sync.read(templateBytes);
  const gen = PNG.sync.read(generatedBytes);
  const { width: tW, height: tH, data: tData } = tpl;
  const { width: gW, height: gH, data: gData } = gen;
  for (let y = 0; y < gH; y++) {
    const sy = Math.min(tH - 1, Math.floor((y * tH) / gH));
    for (let x = 0; x < gW; x++) {
      const sx = Math.min(tW - 1, Math.floor((x * tW) / gW));
      const tIdx = (sy * tW + sx) * 4;
      const r = tData[tIdx], g = tData[tIdx + 1], b = tData[tIdx + 2], a = tData[tIdx + 3];
      if (a < 200) continue;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 110) continue;
      const gIdx = (y * gW + x) * 4;
      gData[gIdx] = r; gData[gIdx + 1] = g; gData[gIdx + 2] = b; gData[gIdx + 3] = 255;
    }
  }
  return PNG.sync.write(gen);
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const {
      moldeName, moldeTemplateUrl, temaNome, temaColors,
      nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual,
      quality: qualityRaw,
    } = await req.json();

    if (!moldeName || !temaNome || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: moldeName, temaNome, nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const quality = qualityRaw === "low" ? "low" : qualityRaw === "high" ? "high" : "medium";

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const colorsDesc = corDominante
      ? `Cor dominante/principal: ${corDominante}. Use esta cor como destaque principal.`
      : temaColors?.length
        ? `Paleta de cores do tema: ${temaColors.join(", ")}.`
        : "";

    const safeThemeDesc = getSafeThemeDescription(temaNome);
    const idadeText = idade ? ` — incluir o número "${idade}" como numeral decorativo, sem mencionar idade ou aniversário` : "";
    const fraseText = frase ? `\nFRASE DECORATIVA: "${frase}" — usar como lettering curto em uma face secundária do molde.` : "";

    const fonteMap: Record<string, string> = {
      divertida: "fonte arredondada, lúdica e divertida tipo cartoon",
      elegante: "fonte fina, serifada e sofisticada",
      negrito: "fonte grossa, bold e impactante tipo poster",
      manuscrita: "fonte manuscrita/cursiva como escrita à mão",
      fantasia: "fonte decorativa e fantasiosa combinando com o tema",
      minimalista: "fonte clean, sans-serif moderna e minimalista",
      retro: "fonte vintage/retrô com estilo nostálgico",
    };
    const fonteDesc = fonteMap[fonteEstilo || "divertida"] || fonteMap.divertida;

    const drawMap: Record<string, string> = {
      cartoon: "estilo cartoon colorido, desenho animado vibrante com contornos definidos",
      aquarela: "estilo aquarela artístico com pinceladas suaves, tons delicados e textura de papel",
      flat: "estilo flat design vetorial, formas geométricas limpas, cores sólidas, sem sombras",
      realista: "estilo realista com ilustrações detalhadas, texturas e sombras naturais",
      kawaii: "estilo kawaii japonês, personagens fofos com olhos grandes, cores pastel suaves",
      handdrawn: "estilo desenhado à mão, traço manual irregular, visual artesanal e autêntico",
      "3d": "estilo 3D com volume, profundidade, sombras e efeitos de perspectiva",
      pixel: "estilo pixel art retro, pixels visíveis, paleta limitada, visual de jogo clássico",
    };
    const drawDesc = drawMap[desenhoEstilo || "cartoon"] || drawMap.cartoon;

    const densityMap: Record<string, string> = {
      minimalista: "design MINIMALISTA — poucos elementos, muito espaço em branco, clean e elegante, apenas o essencial",
      equilibrado: "design EQUILIBRADO — quantidade moderada de elementos decorativos, nem vazio nem cheio demais",
      decorado: "design DECORADO — bastante detalhes, enfeites, padrões e elementos decorativos em todas as faces",
      maximalista: "design MAXIMALISTA — extremamente cheio de elementos, cores vibrantes, padrões complexos, sem espaço vazio, muitos detalhes e enfeites por toda parte",
    };
    const densityDesc = densityMap[densidadeVisual || "equilibrado"] || densityMap.equilibrado;

    // Baixa template e detecta tamanho
    let templateBytes: Uint8Array | null = null;
    let templateBlob: Blob | null = null;
    let outputSize = "1024x1536";
    if (moldeTemplateUrl) {
      try {
        const r = await fetch(moldeTemplateUrl);
        if (r.ok) {
          const buf = new Uint8Array(await r.arrayBuffer());
          templateBytes = buf;
          templateBlob = new Blob([buf], { type: r.headers.get("content-type") || "image/png" });
          let w = 0, h = 0;
          if (buf[0] === 0x89 && buf[1] === 0x50) {
            w = (buf[16] << 24) | (buf[17] << 16) | (buf[18] << 8) | buf[19];
            h = (buf[20] << 24) | (buf[21] << 16) | (buf[22] << 8) | buf[23];
          } else if (buf[0] === 0xff && buf[1] === 0xd8) {
            let i = 2;
            while (i < buf.length) {
              if (buf[i] !== 0xff) break;
              const marker = buf[i + 1];
              const len = (buf[i + 2] << 8) | buf[i + 3];
              if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
                h = (buf[i + 5] << 8) | buf[i + 6];
                w = (buf[i + 7] << 8) | buf[i + 8];
                break;
              }
              i += 2 + len;
            }
          }
          if (w > 0 && h > 0) {
            const ratio = w / h;
            if (ratio > 1.15) outputSize = "1536x1024";
            else if (ratio < 0.87) outputSize = "1024x1536";
            else outputSize = "1024x1024";
          }
        }
      } catch (e) {
        console.warn("Template fetch error:", e);
      }
    }

    const editPrompt = `Você recebeu uma imagem que JÁ É o molde planificado final de ${moldeName}.

TAREFA: aplicar decoração temática APENAS dentro das faces internas do molde, sem alterar absolutamente nada da estrutura.

REGRAS ABSOLUTAS:
1. NÃO redesenhe o molde. NÃO altere contorno externo, proporções, abas, formato.
2. PRESERVE EXATAMENTE as linhas de corte (contínuas) e linhas de dobra (pontilhadas).
3. PRESERVE o fundo branco fora do contorno.
4. Decoração SOMENTE dentro das faces internas.

DECORAÇÃO:
- TEMA SEGURO: ${safeThemeDesc}
- PALAVRA EM DESTAQUE: "${nome}" — grande, legível, na face principal${idadeText}
- ${colorsDesc}${fraseText}
- ESTILO TIPOGRÁFICO: ${fonteDesc}.
- ESTILO DE ILUSTRAÇÃO: ${drawDesc}.
- DENSIDADE VISUAL: ${densityDesc}.

PROIBIÇÕES: sem crianças, pessoas reais, celebridades, personagens registrados, logotipos ou marcas. Textos em pt-BR.`;

    const callOpenAI = () => {
      if (templateBlob) {
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", editPrompt);
        form.append("size", outputSize);
        form.append("n", "1");
        form.append("quality", quality);
        form.append("stream", "true");
        form.append("partial_images", "2");
        form.append("image", templateBlob, "template.png");
        return fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
      }
      return fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: editPrompt,
          size: outputSize,
          n: 1,
          quality,
          stream: true,
          partial_images: 2,
          moderation: "low",
        }),
      });
    };

    const openaiRes = await callOpenAI();

    if (!openaiRes.ok || !openaiRes.body) {
      const errText = await openaiRes.text().catch(() => "");
      console.error("OpenAI error:", openaiRes.status, errText);
      const status = openaiRes.status === 429 ? 429 : 500;
      const msg =
        openaiRes.status === 429
          ? "Muitas requisições. Aguarde alguns segundos."
          : errText.includes("moderation_blocked")
            ? "Tema bloqueado pela moderação da IA. Tente um tema diferente."
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
      let bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
        try { bytes = compositeMoldLines(templateBytes, bytes); } catch (e) { console.warn("composite skipped:", e); }
      }
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
        const filePath = `public/${fileName}`;
        const { error: upErr } = await supabase.storage
          .from("artes-geradas")
          .upload(filePath, bytes, { contentType: "image/png", upsert: false });
        if (upErr) {
          console.error("upload error:", upErr);
          return;
        }
        const { data: pub } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
        const meta = {
          type: "meta.uploaded",
          imageUrl: pub.publicUrl,
          imageBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
        };
        await writer.write(encoder.encode(`event: meta.uploaded\ndata: ${JSON.stringify(meta)}\n\n`));
      } catch (e) {
        console.error("upload step error:", e);
      }
    };

    // Caminho A: upstream NÃO é SSE (OpenAI ignorou stream=true). Lê JSON, sintetiza events.
    if (!isSSE) {
      const json = await openaiRes.json().catch((e) => {
        console.error("Failed to parse OpenAI JSON:", e);
        return null;
      });
      const b64: string | undefined = json?.data?.[0]?.b64_json;
      if (!b64) {
        console.error("OpenAI non-SSE response had no b64_json:", JSON.stringify(json).slice(0, 500));
        return new Response(
          JSON.stringify({ error: "A IA não retornou uma imagem. Tente novamente." }),
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

    // Caminho B: upstream É SSE. Repassa eventos e captura `completed`.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = openaiRes.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finalB64: string | null = null;
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          await writer.write(value);
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf("\n\n")) !== -1) {
            const block = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            let evt = "";
            let data = "";
            for (const line of block.split("\n")) {
              if (line.startsWith("event:")) evt = line.slice(6).trim();
              else if (line.startsWith("data:")) data += line.slice(5).trim();
            }
            if (evt === "image_generation.completed" && data) {
              try { finalB64 = JSON.parse(data).b64_json ?? null; } catch {}
            }
          }
        }
        if (finalB64) {
          await finalizeAndUpload(finalB64, writer, encoder);
        } else {
          console.error("SSE stream ended without completed event");
        }
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
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
