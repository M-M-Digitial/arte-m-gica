import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PNG } from "https://esm.sh/pngjs@7.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COTA_MENSAL = 30; // artes com IA por usuário/mês (admins: ilimitado)

// extrai user id/email do JWT já verificado pelo gateway (verify_jwt=true)
function parseJwt(authHeader: string | null): { sub: string | null; email: string | null } {
  try {
    const token = (authHeader ?? "").replace(/^Bearer\s+/i, "");
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { sub: payload.sub ?? null, email: payload.email ?? null };
  } catch {
    return { sub: null, email: null };
  }
}

const normalizeTheme = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

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
  const alternative = protectedThemeAlternatives.find(([pattern]) => pattern.test(normalized));
  return alternative
    ? alternative[1]
    : `${temaNome}, reinterpretado como tema decorativo genérico sem marcas, personagens licenciados ou pessoas reais`;
};

// Re-estampa as linhas escuras do template por cima da arte gerada — garantia
// determinística de que contorno, abas e linhas de dobra ficam intactos.
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
      const r = tData[tIdx];
      const g = tData[tIdx + 1];
      const b = tData[tIdx + 2];
      const a = tData[tIdx + 3];
      if (a < 200) continue;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 110) continue;
      const gIdx = (y * gW + x) * 4;
      gData[gIdx] = r;
      gData[gIdx + 1] = g;
      gData[gIdx + 2] = b;
      gData[gIdx + 3] = 255;
    }
  }
  return PNG.sync.write(gen);
}

// A4 — Máscara de edição: gera uma máscara onde SÓ as faces internas do molde
// ficam editáveis (alpha 0). As linhas escuras (corte/dobra) e o fundo externo
// ficam preservados (alpha 255), então a IA não desloca nem redesenha a estrutura.
// Retorna null quando a máscara sai degenerada (nada/tudo editável) — nesse caso
// o chamador cai no fluxo sem máscara.
function buildEditMask(templateBytes: Uint8Array): Uint8Array | null {
  const tpl = PNG.sync.read(templateBytes);
  const { width: W, height: H, data } = tpl;
  const N = W * H;
  if (N === 0) return null;

  // 1) Classifica pixels de linha (opacos e escuros).
  const isLine = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const a = data[i * 4 + 3];
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (a >= 200 && lum < 110) isLine[i] = 1;
  }

  // 2) Flood-fill a partir das bordas, atravessando pixels que NÃO são linha.
  //    Tudo alcançado = fundo externo.
  const outside = new Uint8Array(N);
  const stack = new Int32Array(N);
  let sp = 0;
  const pushIf = (idx: number) => {
    if (!outside[idx] && !isLine[idx]) {
      outside[idx] = 1;
      stack[sp++] = idx;
    }
  };
  for (let x = 0; x < W; x++) {
    pushIf(x);
    pushIf((H - 1) * W + x);
  }
  for (let y = 0; y < H; y++) {
    pushIf(y * W);
    pushIf(y * W + (W - 1));
  }
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % W;
    const y = (idx / W) | 0;
    if (x > 0) pushIf(idx - 1);
    if (x < W - 1) pushIf(idx + 1);
    if (y > 0) pushIf(idx - W);
    if (y < H - 1) pushIf(idx + W);
  }

  // 3) Editável = não é linha E não é fundo externo (faces internas fechadas).
  const mask = new PNG({ width: W, height: H });
  let editableCount = 0;
  for (let i = 0; i < N; i++) {
    const editable = !isLine[i] && !outside[i];
    if (editable) editableCount++;
    mask.data[i * 4] = 0;
    mask.data[i * 4 + 1] = 0;
    mask.data[i * 4 + 2] = 0;
    mask.data[i * 4 + 3] = editable ? 0 : 255; // alpha 0 = editar; 255 = preservar
  }

  const frac = editableCount / N;
  if (frac < 0.04 || frac > 0.96) {
    console.warn(`buildEditMask: fração editável ${frac.toFixed(3)} degenerada — sem máscara.`);
    return null;
  }
  console.log(`buildEditMask: fração editável ${frac.toFixed(3)}.`);
  return PNG.sync.write(mask);
}

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moldeName, moldeTemplateUrl, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual, quality: qualityRaw } = await req.json();

    // Rascunho rápido usa "low"; qualquer outro valor mantém "high" (comportamento de produção intacto).
    const quality = qualityRaw === "low" ? "low" : "high";

    if (!moldeName || !temaNome || !nome) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: moldeName, temaNome, nome" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminDb = createClient(supabaseUrl, supabaseKey);

    // ---- COTA MENSAL (admins ilimitado) ----
    const { sub: userId, email: userEmail } = parseJwt(req.headers.get("Authorization"));
    if (userId) {
      const { data: roleRow } = await adminDb
        .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
      if (!roleRow) {
        const inicioMes = new Date();
        inicioMes.setUTCDate(1); inicioMes.setUTCHours(0, 0, 0, 0);
        const { count } = await adminDb
          .from("geracoes_ia")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId)
          .gte("created_at", inicioMes.toISOString());
        if ((count ?? 0) >= COTA_MENSAL) {
          return new Response(
            JSON.stringify({
              error: `Você já usou suas ${COTA_MENSAL} artes com IA deste mês! Elas renovam dia 1º. Enquanto isso, o Compositor de Kits é ilimitado 💖`,
              code: "QUOTA_EXCEEDED",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

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

    // Baixa o template do molde
    let templateBytes: Uint8Array | null = null;
    let templateBlob: Blob | null = null;
    let outputSize = "1024x1536";
    if (moldeTemplateUrl) {
      try {
        const tmplRes = await fetch(moldeTemplateUrl);
        if (tmplRes.ok) {
          const buf = new Uint8Array(await tmplRes.arrayBuffer());
          templateBytes = buf;
          templateBlob = new Blob([buf], { type: tmplRes.headers.get("content-type") || "image/png" });
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
            console.log(`Template ${w}x${h} ratio=${ratio.toFixed(2)} -> output ${outputSize}`);
          }
        } else {
          console.warn("Template fetch failed:", tmplRes.status);
        }
      } catch (e) {
        console.warn("Template fetch error:", e);
      }
    }

    // A4 — constrói a máscara de edição a partir do template (só PNG).
    let maskBlob: Blob | null = null;
    if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
      try {
        const maskBytes = buildEditMask(templateBytes);
        if (maskBytes) {
          maskBlob = new Blob([new Uint8Array(maskBytes)], { type: "image/png" });
          console.log("Máscara de edição construída.");
        }
      } catch (e) {
        console.warn("Falha ao construir máscara — seguindo sem ela:", e);
      }
    }

    // Prompt de EDIÇÃO — o molde já está pronto na imagem de entrada
    const editPrompt = `Você recebeu uma imagem que JÁ É o molde planificado final de ${moldeName}.

TAREFA: aplicar decoração temática APENAS dentro das faces internas do molde, sem alterar absolutamente nada da estrutura.

REGRAS ABSOLUTAS (não negociáveis):
1. NÃO redesenhe o molde. NÃO altere contorno externo, proporções, abas de colagem, formato das faces.
2. PRESERVE EXATAMENTE as linhas de corte (traço contínuo) e linhas de dobra (traço pontilhado) — idênticas à imagem de referência.
3. PRESERVE o fundo branco fora do contorno do molde — não invada essa área.
4. Aplique a decoração SOMENTE dentro das áreas internas (faces fechadas) do molde.

DECORAÇÃO A APLICAR:
- TEMA DECORATIVO SEGURO: ${safeThemeDesc}
- PALAVRA EM DESTAQUE: escreva EXATAMENTE "${nome}" — confira LETRA POR LETRA (acentos incluídos), sem traduzir, sem abreviar, sem duplicar letras. Grande, legível, na face principal${idadeText}
- ${colorsDesc}${fraseText}
- ESTILO TIPOGRÁFICO: ${fonteDesc} para a palavra "${nome}" e demais textos.
- ESTILO DE ILUSTRAÇÃO: ${drawDesc}.
- DENSIDADE VISUAL: ${densityDesc}.
- ACABAMENTO: qualidade de estúdio de papelaria premium — ilustração nítida, cores vibrantes e harmônicas, composição equilibrada, sem ruído, sem artefatos, sem nenhum texto além dos especificados.

PROIBIÇÕES DE CONTEÚDO:
- Sem crianças, pessoas reais, celebridades, personagens registrados, logotipos ou marcas.
- Todos os textos em português do Brasil.

Resultado: o MESMO molde da entrada, com decoração aplicada dentro das faces, linhas técnicas intactas, fundo branco.`;

    // Monta a requisição à OpenAI. `legacy` desliga os recursos novos
    // (máscara + streaming) e reproduz o comportamento antigo comprovado.
    const requestOpenAIImage = (activePrompt: string, useMask: boolean, legacy: boolean) => {
      if (templateBlob) {
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", activePrompt);
        form.append("size", outputSize);
        form.append("n", "1");
        form.append("quality", quality);
        if (!legacy) {
          form.append("stream", "true");
          form.append("partial_images", "2");
        }
        form.append("image", templateBlob, "template.png");
        if (useMask && maskBlob) form.append("mask", maskBlob, "mask.png");
        return fetch("https://api.openai.com/v1/images/edits", {
          method: "POST",
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: form,
        });
      }
      return fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-2",
          prompt: activePrompt,
          size: outputSize,
          n: 1,
          quality,
          moderation: "low",
          ...(legacy ? {} : { stream: true, partial_images: 2 }),
        }),
      });
    };

    const fallbackPrompt = templateBlob
      ? `Você recebeu uma imagem que JÁ É o molde planificado final de ${moldeName}.

TAREFA: aplicar decoração genérica e segura APENAS dentro das faces internas, sem alterar a estrutura.

REGRAS ABSOLUTAS:
1. NÃO redesenhe o molde. PRESERVE contorno, abas, linhas de corte (contínuas) e dobra (pontilhadas) idênticas à referência.
2. PRESERVE o fundo branco fora do contorno.
3. Decoração apenas dentro das faces.

DECORAÇÃO: ${safeThemeDesc}. ${colorsDesc} Estilo: ${drawDesc}. Densidade: ${densityDesc}.
Sem nomes, sem idade, sem crianças, sem personagens registrados, sem marcas, sem pessoas reais. Apenas padrões, flores, estrelas, laços e elementos abstratos originais.`
      : `Design gráfico de papelaria decorativa segura: molde planificado completo de ${moldeName}, aberto e pronto para impressão em A4.

TEMA VISUAL: ${safeThemeDesc}.
${colorsDesc}
ESTILO DE ILUSTRAÇÃO: ${drawDesc}.
DENSIDADE VISUAL: ${densityDesc}.

REGRAS:
1. Sem nomes próprios, idade, crianças, pessoas reais, personagens registrados, logotipos ou marcas.
2. Apenas padrões, formas, ícones genéricos, flores, estrelas, laços e ilustrações originais.
3. Linhas de corte contínuas, linhas de dobra pontilhadas, abas de colagem e fundo branco.
4. Alta resolução, visual alegre, profissional e artesanal.`;

    let usedSafeFallback = false;

    const json429 = () =>
      new Response(
        JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    const moderationBlockedJson = () =>
      new Response(
        JSON.stringify({
          error: "A OpenAI bloqueou este tema por segurança. Gere uma arte segura pelo modelo alternativo do app.",
          code: "OPENAI_MODERATION_BLOCKED",
          fallback: {
            safeThemeDescription: safeThemeDesc,
            message: "Use o fallback local para criar uma arte decorativa sem personagens, marcas ou pessoas reais.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    // Resolve a resposta da imagem com degradação graciosa:
    // 1) tentativa moderna (máscara + streaming)
    // 2) se falhar por parâmetro não suportado → modo legado (sem máscara/stream)
    // 3) se for moderação → prompt seguro
    const resolveImageResponse = async (): Promise<{ ok: Response } | { early: Response }> => {
      // 1) moderna
      let res = await requestOpenAIImage(editPrompt, true, false);
      if (res.ok) return { ok: res };
      if (res.status === 429) return { early: json429() };
      let txt = await res.text();
      console.error("OpenAI error:", res.status, txt);

      if (!txt.includes("moderation_blocked")) {
        // 2) pode ser rejeição de stream/mask → retenta no modo legado comprovado
        console.warn("Retentando em modo legado (sem máscara/stream).");
        res = await requestOpenAIImage(editPrompt, false, true);
        if (res.ok) return { ok: res };
        if (res.status === 429) return { early: json429() };
        txt = await res.text();
        console.error("OpenAI legacy error:", res.status, txt);
        if (!txt.includes("moderation_blocked")) {
          throw new Error(`Erro no serviço de IA: ${res.status}`);
        }
      }

      // 3) moderação → prompt seguro (modo legado por segurança)
      usedSafeFallback = true;
      res = await requestOpenAIImage(fallbackPrompt, false, true);
      if (res.ok) return { ok: res };
      const ftxt = await res.text().catch(() => "");
      console.error("OpenAI fallback error:", res.status, ftxt);
      return { early: moderationBlockedJson() };
    };

    const resolved = await resolveImageResponse();
    if ("early" in resolved) return resolved.early;
    const response = resolved.ok;

    // geração aconteceu — registra o uso da cota (best-effort)
    if (userId) {
      adminDb.from("geracoes_ia").insert({ user_id: userId, email: userEmail }).then(({ error }) => {
        if (error) console.warn("registro de cota falhou:", error.message);
      });
    }

    // Compõe as linhas do molde na imagem final, sobe pro Storage e emite o meta.
    const finalizeAndUpload = async (
      b64: string,
      writer: WritableStreamDefaultWriter<Uint8Array>,
      encoder: TextEncoder,
    ) => {
      try {
        let bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
          try {
            bytes = new Uint8Array(compositeMoldLines(templateBytes, bytes));
            console.log("Mold lines composited successfully.");
          } catch (e) {
            console.warn("Composite step skipped:", e);
          }
        }
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
          usedSafeFallback,
        };
        await writer.write(encoder.encode(`event: meta.uploaded\ndata: ${JSON.stringify(meta)}\n\n`));
      } catch (e) {
        console.error("finalize step error:", e);
      }
    };

    const upstreamCT = response.headers.get("content-type") || "";
    const isSSE = upstreamCT.includes("text/event-stream");
    console.log("OpenAI upstream content-type:", upstreamCT, "isSSE:", isSSE);

    // Caminho sem streaming (modo legado ou upstream que devolveu JSON):
    // embrulha a imagem única num evento SSE + meta, mantendo o front unificado.
    if (!isSSE) {
      const json = await response.json().catch((e) => {
        console.error("Failed to parse OpenAI JSON:", e);
        return null;
      });
      const b64: string | undefined = json?.data?.[0]?.b64_json;
      if (!b64) {
        console.error("OpenAI non-SSE response had no b64_json:", JSON.stringify(json).slice(0, 500));
        return new Response(
          JSON.stringify({ error: "A IA não gerou a imagem. Tente novamente." }),
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

    // Caminho com streaming: repassa os frames parciais ao cliente e, ao final,
    // compõe as linhas + faz upload + emite meta.uploaded.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    (async () => {
      const reader = response.body!.getReader();
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
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
