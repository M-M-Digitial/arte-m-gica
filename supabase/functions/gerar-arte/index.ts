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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const colorsDesc = corDominante
      ? `Cor dominante/principal: ${corDominante}. Use esta cor como destaque principal.`
      : temaColors?.length
        ? `Paleta de cores do tema: ${temaColors.join(", ")}.`
        : "";

    const idadeText = idade ? ` (${idade} anos)` : "";
    const fraseText = frase ? `\nFRASE PERSONALIZADA: "${frase}" — incluir na face secundária do molde com destaque.` : "";

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

    const prompt = `Crie uma arte COMPLETA para lembrancinha de festa, já aplicada no molde planificado, pronta para imprimir, recortar e montar.

MOLDE: ${moldeName} — gere o molde planificado (aberto, flat) com todas as abas de colagem e linhas de dobra pontilhadas.
TEMA: ${temaNome}
NOME: ${nome}${idadeText}
${colorsDesc}
${fraseText}
ESTILO DE FONTE: Use ${fonteDesc} para o nome "${nome}" e demais textos.
ESTILO DE DESENHO/ILUSTRAÇÃO: ${drawDesc}. Todo o visual artístico do molde deve seguir este estilo.
DENSIDADE VISUAL: ${densityDesc}.

REGRAS OBRIGATÓRIAS:
1. A imagem deve mostrar o MOLDE PLANIFICADO COMPLETO (todas as faces abertas, como um padrão de recorte)
2. Linhas de corte = traço contínuo. Linhas de dobra = traço pontilhado.
3. O tema "${temaNome}" deve decorar TODAS as faces com padrões, ilustrações e cores do tema
4. O nome "${nome}" deve aparecer grande e legível na face principal
5. Todos os textos em PORTUGUÊS DO BRASIL
6. Estilo profissional de papelaria de festa — colorido, vibrante, alegre
7. Fundo branco ao redor do molde (área de corte)
8. Alta resolução, pronto para impressão em A4`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente de novo." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "Créditos esgotados. Adicione créditos para continuar.",
            code: "AI_CREDITS_EXHAUSTED",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`Erro no serviço de IA: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      throw new Error("A IA não gerou a imagem. Tente novamente.");
    }

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
