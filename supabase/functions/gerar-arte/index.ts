import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
// imagescript é nativa de Deno — o pngjs via esm.sh falhava em runtime no
// edge (PNG.sync.read), e máscara + carimbo eram pulados em silêncio.
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COTA_MENSAL = 30; // artes com IA por usuário/mês (admins: ilimitado)

// A geração roda como job em background na OpenAI (Responses API): o "start"
// cria o job e devolve o id; o front consulta "status" até a imagem ficar
// pronta. Nenhuma requisição fica presa esperando a IA — o fluxo antigo de
// stream morria quando a conexão edge→OpenAI caía no silêncio antes do final.

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
    .replace(/[̀-ͯ]/g, "")
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
// Varre o TEMPLATE e projeta cada pixel de traço na arte: no sentido inverso
// (amostrar o template por pixel da arte) linhas de 1px caem entre as amostras
// no downscale e o traço sai pontilhado (~44% de cobertura). O limiar 200 pega
// também o anti-aliasing do traço, e "escurecer sem clarear" preserva a arte.
// Validado: 100% dos pixels de linha do gabarito presentes na arte final.
async function compositeMoldLines(templateBytes: Uint8Array, generatedBytes: Uint8Array): Promise<Uint8Array> {
  const tpl = await Image.decode(templateBytes);
  const gen = await Image.decode(generatedBytes);
  const tW = tpl.width, tH = tpl.height, tData = tpl.bitmap;
  const gW = gen.width, gH = gen.height, gData = gen.bitmap;

  for (let y = 0; y < tH; y++) {
    const gy = Math.min(gH - 1, Math.round((y * gH) / tH));
    for (let x = 0; x < tW; x++) {
      const tIdx = (y * tW + x) * 4;
      const a = tData[tIdx + 3];
      if (a < 200) continue;
      const r = tData[tIdx];
      const g = tData[tIdx + 1];
      const b = tData[tIdx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 200) continue;
      const gx = Math.min(gW - 1, Math.round((x * gW) / tW));
      const gIdx = (gy * gW + gx) * 4;
      if (0.299 * gData[gIdx] + 0.587 * gData[gIdx + 1] + 0.114 * gData[gIdx + 2] > lum) {
        gData[gIdx] = r;
        gData[gIdx + 1] = g;
        gData[gIdx + 2] = b;
        gData[gIdx + 3] = 255;
      }
    }
  }
  return await gen.encode();
}

// A4 — Máscara de edição: gera uma máscara onde SÓ as faces internas do molde
// ficam editáveis (alpha 0). As linhas escuras (corte/dobra) e o fundo externo
// ficam preservados (alpha 255), então a IA não desloca nem redesenha a estrutura.
// Retorna null quando a máscara sai degenerada (nada/tudo editável) — nesse caso
// o chamador cai no fluxo sem máscara.
async function buildEditMask(templateBytes: Uint8Array): Promise<Uint8Array | null> {
  const tpl = await Image.decode(templateBytes);
  const W = tpl.width, H = tpl.height, data = tpl.bitmap;
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
  const mask = new Image(W, H);
  let editableCount = 0;
  for (let i = 0; i < N; i++) {
    const editable = !isLine[i] && !outside[i];
    if (editable) editableCount++;
    mask.bitmap[i * 4] = 0;
    mask.bitmap[i * 4 + 1] = 0;
    mask.bitmap[i * 4 + 2] = 0;
    mask.bitmap[i * 4 + 3] = editable ? 0 : 255; // alpha 0 = editar; 255 = preservar
  }

  const frac = editableCount / N;
  if (frac < 0.04 || frac > 0.96) {
    console.warn(`buildEditMask: fração editável ${frac.toFixed(3)} degenerada — sem máscara.`);
    return null;
  }
  console.log(`buildEditMask: fração editável ${frac.toFixed(3)}.`);
  return await mask.encode();
}

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

// ---- START: cria o job em background na OpenAI ----
async function handleStart(body: Record<string, unknown>, OPENAI_API_KEY: string) {
  const { moldeName, moldeTemplateUrl, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual, quality: qualityRaw, safeMode } = body as Record<string, any>;

  const quality = qualityRaw === "low" ? "low" : "high";

  if (!moldeName || !temaNome || !nome) {
    return jsonResponse({ error: "Campos obrigatórios: moldeName, temaNome, nome" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminDb = createClient(supabaseUrl, supabaseKey);

  // ---- COTA MENSAL (admins ilimitado) ----
  const { sub: userId, email: userEmail } = parseJwt(
    (body.__authHeader as string | null) ?? null,
  );
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
        return jsonResponse({
          error: `Você já usou suas ${COTA_MENSAL} artes com IA deste mês! Elas renovam dia 1º. Enquanto isso, o Compositor de Kits é ilimitado 💖`,
          code: "QUOTA_EXCEEDED",
        });
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
  let outputSize = "1024x1536";
  if (moldeTemplateUrl) {
    try {
      const tmplRes = await fetch(moldeTemplateUrl);
      if (tmplRes.ok) {
        const buf = new Uint8Array(await tmplRes.arrayBuffer());
        templateBytes = buf;
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
  let maskDataUrl: string | null = null;
  if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
    try {
      const maskBytes = await buildEditMask(templateBytes);
      if (maskBytes) {
        maskDataUrl = `data:image/png;base64,${bytesToBase64(new Uint8Array(maskBytes))}`;
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

  const fallbackPrompt = templateBytes
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

  const usedSafeFallback = safeMode === true;
  const activePrompt = usedSafeFallback ? fallbackPrompt : editPrompt;

  const createJob = async (withMask: boolean) => {
    const content: Array<Record<string, unknown>> = [{ type: "input_text", text: activePrompt }];
    if (templateBytes) {
      content.push({
        type: "input_image",
        image_url: `data:image/png;base64,${bytesToBase64(templateBytes)}`,
      });
    }
    const tool: Record<string, unknown> = {
      type: "image_generation",
      model: "gpt-image-2",
      size: outputSize,
      quality,
      moderation: "low",
    };
    if (withMask && maskDataUrl) tool.input_image_mask = { image_url: maskDataUrl };
    return await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        background: true,
        store: true,
        input: [{ role: "user", content }],
        tools: [tool],
        tool_choice: { type: "image_generation" },
      }),
    });
  };

  let res = await createJob(true);
  if (!res.ok) {
    const txt = await res.text();
    console.error("OpenAI create error:", res.status, txt);
    if (res.status === 429) {
      return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }, 429);
    }
    if (isModerationError(txt) && !usedSafeFallback) {
      return jsonResponse({
        error: "A OpenAI bloqueou este tema por segurança.",
        code: "OPENAI_MODERATION_BLOCKED",
      });
    }
    // pode ser rejeição da máscara → retenta sem ela
    res = await createJob(false);
    if (!res.ok) {
      const txt2 = await res.text();
      console.error("OpenAI create (sem máscara) error:", res.status, txt2);
      if (res.status === 429) {
        return jsonResponse({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }, 429);
      }
      if (isModerationError(txt2) && !usedSafeFallback) {
        return jsonResponse({
          error: "A OpenAI bloqueou este tema por segurança.",
          code: "OPENAI_MODERATION_BLOCKED",
        });
      }
      return jsonResponse({ error: `Erro no serviço de IA: ${res.status}` }, 500);
    }
  }

  const job = await res.json();
  if (!job?.id) {
    console.error("OpenAI create sem id:", JSON.stringify(job).slice(0, 400));
    return jsonResponse({ error: "A IA não iniciou a geração. Tente novamente." }, 500);
  }

  // job criado — registra o uso da cota (best-effort)
  if (userId) {
    adminDb.from("geracoes_ia").insert({ user_id: userId, email: userEmail }).then(({ error }) => {
      if (error) console.warn("registro de cota falhou:", error.message);
    });
  }

  console.log("Job criado:", job.id, "status:", job.status, "quality:", quality);
  return jsonResponse({ jobId: job.id, usedSafeFallback });
}

// ---- STATUS: consulta o job; quando pronto, compõe as linhas + sobe pro Storage ----
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
    return jsonResponse({ error: `Erro ao consultar a geração: ${res.status}` }, 500);
  }
  const job = await res.json();

  if (job.status === "queued" || job.status === "in_progress") {
    return jsonResponse({ status: "processing" });
  }

  if (job.status !== "completed") {
    const errText = JSON.stringify(job.error ?? job.incomplete_details ?? {});
    console.error("Job não completou:", job.status, errText);
    if (isModerationError(errText)) {
      return jsonResponse({
        status: "error",
        error: "A OpenAI bloqueou este tema por segurança.",
        code: "OPENAI_MODERATION_BLOCKED",
      });
    }
    return jsonResponse({ status: "error", error: "A IA não conseguiu gerar a imagem. Tente novamente." });
  }

  const call = (job.output ?? []).find((o: Record<string, unknown>) => o.type === "image_generation_call");
  const b64 = typeof call?.result === "string" ? call.result : null;
  if (!b64) {
    console.error("Job completou sem imagem:", JSON.stringify((job.output ?? []).map((o: Record<string, unknown>) => o.type)));
    return jsonResponse({ status: "error", error: "A IA não gerou a imagem. Tente novamente." });
  }

  let bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  // Compõe as linhas do molde por cima da arte final (garantia determinística).
  // O resultado vai na resposta (composited/compositeError) — falha aqui não
  // pode mais ser silenciosa.
  let composited = false;
  let compositeError: string | null = null;
  const moldeTemplateUrl = typeof body.moldeTemplateUrl === "string" ? body.moldeTemplateUrl : "";
  if (moldeTemplateUrl) {
    try {
      const tmplRes = await fetch(moldeTemplateUrl);
      if (!tmplRes.ok) throw new Error(`template ${tmplRes.status}`);
      const templateBytes = new Uint8Array(await tmplRes.arrayBuffer());
      bytes = new Uint8Array(await compositeMoldLines(templateBytes, bytes));
      composited = true;
      console.log("Mold lines composited successfully.");
    } catch (e) {
      compositeError = e instanceof Error ? e.message : String(e);
      console.warn("Composite step skipped:", e);
    }
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
  const filePath = `public/${fileName}`;
  const { error: upErr } = await supabase.storage
    .from("artes-geradas")
    .upload(filePath, bytes, { contentType: "image/png", upsert: false });
  if (upErr) {
    console.error("upload error:", upErr);
    return jsonResponse({
      status: "done",
      imageUrl: null,
      imageBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
      composited,
      compositeError,
    });
  }
  const { data: pub } = supabase.storage.from("artes-geradas").getPublicUrl(filePath);
  return jsonResponse({
    status: "done",
    imageUrl: pub.publicUrl,
    imageBase64: `data:image/png;base64,${bytesToBase64(bytes)}`,
    composited,
    compositeError,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const body = (await req.json()) as Record<string, unknown>;

    if (body.action === "status") {
      return await handleStatus(body, OPENAI_API_KEY);
    }

    // o parseJwt precisa do header original — passa por dentro do body interno
    body.__authHeader = req.headers.get("Authorization");
    return await handleStart(body, OPENAI_API_KEY);
  } catch (error) {
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
