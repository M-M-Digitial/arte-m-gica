import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PNG } from "https://esm.sh/pngjs@7.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moldeName, moldeTemplateUrl, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual } = await req.json();

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
- PALAVRA EM DESTAQUE: "${nome}" — grande, legível, na face principal${idadeText}
- ${colorsDesc}${fraseText}
- ESTILO TIPOGRÁFICO: ${fonteDesc} para a palavra "${nome}" e demais textos.
- ESTILO DE ILUSTRAÇÃO: ${drawDesc}.
- DENSIDADE VISUAL: ${densityDesc}.

PROIBIÇÕES DE CONTEÚDO:
- Sem crianças, pessoas reais, celebridades, personagens registrados, logotipos ou marcas.
- Todos os textos em português do Brasil.

Resultado: o MESMO molde da entrada, com decoração aplicada dentro das faces, linhas técnicas intactas, fundo branco.`;

    const requestOpenAIImage = (activePrompt: string) => {
      if (templateBlob) {
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", activePrompt);
        form.append("size", outputSize);
        form.append("n", "1");
        form.append("quality", "high");
        
        form.append("image", templateBlob, "template.png");
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
          quality: "high",
          moderation: "low",
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

    let response = await requestOpenAIImage(editPrompt);
    let usedSafeFallback = false;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      if (errorText.includes("moderation_blocked")) {
        usedSafeFallback = true;
        response = await requestOpenAIImage(fallbackPrompt);
        if (!response.ok) {
          const fallbackErrorText = await response.text();
          console.error("OpenAI fallback error:", response.status, fallbackErrorText);
          return new Response(
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
        }
      } else {
        throw new Error(`Erro no serviço de IA: ${response.status}`);
      }
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("A IA não gerou a imagem. Tente novamente.");
    }

    let finalBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Passo 4 — composição final: re-estampar linhas do molde por cima da arte
    if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
      try {
        finalBytes = compositeMoldLines(templateBytes, finalBytes);
        console.log("Mold lines composited successfully.");
      } catch (e) {
        console.warn("Composite step skipped:", e);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artes-geradas")
      .upload(filePath, finalBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Erro ao salvar a arte.");
    }

    const { data: publicUrl } = supabase.storage
      .from("artes-geradas")
      .getPublicUrl(filePath);

    const imageData = `data:image/png;base64,${bytesToBase64(finalBytes)}`;

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl.publicUrl,
        imageBase64: imageData,
        usedSafeFallback,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PNG } from "https://esm.sh/pngjs@7.0.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moldeName, moldeTemplateUrl, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual } = await req.json();

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
- PALAVRA EM DESTAQUE: "${nome}" — grande, legível, na face principal${idadeText}
- ${colorsDesc}${fraseText}
- ESTILO TIPOGRÁFICO: ${fonteDesc} para a palavra "${nome}" e demais textos.
- ESTILO DE ILUSTRAÇÃO: ${drawDesc}.
- DENSIDADE VISUAL: ${densityDesc}.

PROIBIÇÕES DE CONTEÚDO:
- Sem crianças, pessoas reais, celebridades, personagens registrados, logotipos ou marcas.
- Todos os textos em português do Brasil.

Resultado: o MESMO molde da entrada, com decoração aplicada dentro das faces, linhas técnicas intactas, fundo branco.`;

    const requestOpenAIImage = (activePrompt: string) => {
      if (templateBlob) {
        const form = new FormData();
        form.append("model", "gpt-image-2");
        form.append("prompt", activePrompt);
        form.append("size", outputSize);
        form.append("n", "1");
        form.append("quality", "high");
        
        form.append("image", templateBlob, "template.png");
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
          quality: "high",
          moderation: "low",
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

    let response = await requestOpenAIImage(editPrompt);
    let usedSafeFallback = false;

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("OpenAI error:", response.status, errorText);
      if (errorText.includes("moderation_blocked")) {
        usedSafeFallback = true;
        response = await requestOpenAIImage(fallbackPrompt);
        if (!response.ok) {
          const fallbackErrorText = await response.text();
          console.error("OpenAI fallback error:", response.status, fallbackErrorText);
          return new Response(
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
        }
      } else {
        throw new Error(`Erro no serviço de IA: ${response.status}`);
      }
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("A IA não gerou a imagem. Tente novamente.");
    }

    let finalBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

    // Passo 4 — composição final: re-estampar linhas do molde por cima da arte
    if (templateBytes && templateBytes[0] === 0x89 && templateBytes[1] === 0x50) {
      try {
        finalBytes = compositeMoldLines(templateBytes, finalBytes);
        console.log("Mold lines composited successfully.");
      } catch (e) {
        console.warn("Composite step skipped:", e);
      }
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artes-geradas")
      .upload(filePath, finalBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Erro ao salvar a arte.");
    }

    const { data: publicUrl } = supabase.storage
      .from("artes-geradas")
      .getPublicUrl(filePath);

    const imageData = `data:image/png;base64,${bytesToBase64(finalBytes)}`;

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl.publicUrl,
        imageBase64: imageData,
        usedSafeFallback,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("gerar-arte error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
