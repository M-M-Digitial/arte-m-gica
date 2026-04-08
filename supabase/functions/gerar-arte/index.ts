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
    const { moldeName, temaNome, temaColors, nome, idade, frase } = await req.json();

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

    const colorsDescription = temaColors?.length
      ? `usando a paleta de cores: ${temaColors.join(", ")}`
      : "";

    const idadeText = idade ? `, idade ${idade} anos` : "";
    const fraseText = frase ? `, com a frase "${frase}"` : "";

    const prompt = `Crie uma arte personalizada para lembrancinha de festa infantil brasileira.

Tipo de embalagem: ${moldeName} (molde planificado, aberto, pronto para impressão e recorte)
Tema da festa: ${temaNome}
Personalização: Nome "${nome}"${idadeText}${fraseText}
${colorsDescription}

INSTRUÇÕES IMPORTANTES:
- A arte deve ser um MOLDE PLANIFICADO (aberto, flat, como se fosse recortado e montado depois)
- Deve ter linhas de corte e dobra claramente visíveis
- O design deve cobrir todas as faces do molde com o tema "${temaNome}"
- O nome "${nome}" deve aparecer de forma proeminente e legível
- Use elementos decorativos do tema (personagens estilizados, padrões, ícones temáticos)
- Todos os textos devem estar em PORTUGUÊS DO BRASIL
- A arte deve ser colorida, vibrante e festiva
- Estilo profissional de papelaria personalizada para festa
- Resolução alta, pronta para impressão em papel A4`;

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
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos esgotados. Adicione créditos na sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content || "";

    if (!imageData) {
      throw new Error("A IA não retornou uma imagem. Tente novamente.");
    }

    // Upload image to storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Convert base64 to binary
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
      throw new Error("Erro ao salvar a arte gerada.");
    }

    const { data: publicUrl } = supabase.storage
      .from("artes-geradas")
      .getPublicUrl(filePath);

    return new Response(
      JSON.stringify({
        imageUrl: publicUrl.publicUrl,
        imageBase64: imageData,
        description: textResponse,
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
