import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { moldeName, temaNome, temaColors, nome, idade, frase, corDominante, fonteEstilo, desenhoEstilo, densidadeVisual } = await req.json();

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

    const idadeText = idade ? ` — número decorativo "${idade}" como elemento gráfico` : "";
    const fraseText = frase ? `\nFRASE DECORATIVA: "${frase}" — incluir na face secundária do molde com destaque tipográfico.` : "";

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

    const prompt = `Design gráfico de papelaria decorativa: arte completa aplicada em um molde planificado de embalagem, pronto para impressão e montagem artesanal.

MOLDE: ${moldeName} — desenhe o molde planificado (aberto, flat), com todas as abas de colagem e linhas de dobra pontilhadas.
TEMA DECORATIVO: ${temaNome}
PALAVRA EM DESTAQUE: "${nome}"${idadeText}
${colorsDesc}
${fraseText}
ESTILO TIPOGRÁFICO: ${fonteDesc} para a palavra "${nome}" e demais textos.
ESTILO DE ILUSTRAÇÃO: ${drawDesc}. Todo o visual do molde deve seguir este estilo.
DENSIDADE VISUAL: ${densityDesc}.

REGRAS:
1. Mostre o MOLDE PLANIFICADO COMPLETO (todas as faces abertas, como padrão de recorte vetorial).
2. Linhas de corte = traço contínuo. Linhas de dobra = traço pontilhado.
3. O tema "${temaNome}" decora todas as faces com padrões, ilustrações e cores.
4. A palavra "${nome}" aparece grande e legível na face principal.
5. Todos os textos em português do Brasil.
6. Estilo de papelaria decorativa profissional — colorido, vibrante, alegre.
7. Fundo branco ao redor do molde (área de recorte).
8. Alta resolução para impressão em A4.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1536",
        n: 1,
      }),
    });

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
        return new Response(
          JSON.stringify({ error: "O conteúdo foi bloqueado pela moderação da OpenAI. Tente outro nome, tema ou frase mais neutra." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Erro no serviço de IA: ${response.status}`);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("A IA não gerou a imagem. Tente novamente.");
    }
    const imageData = `data:image/png;base64,${b64}`;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    const fileName = `arte_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`;
    const filePath = `public/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("artes-geradas")
      .upload(filePath, binaryData, {
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

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl.publicUrl,
        imageBase64: imageData,
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
