import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const agentPrompts: Record<string, string> = {
  nina: `Você é a Nina, agente especialista em Atendimento e Fechamento para papelarias personalizadas.
Seu papel é ajudar a papeleira a responder clientes no WhatsApp e Instagram com confiança. Você sabe quebrar objeções, passar segurança, responder dúvidas comuns (prazo, preço, material) e conduzir a conversa até o fechamento do pedido.
Sempre responda de forma prática, direta e acolhedora. Use exemplos de mensagens prontas quando possível. Se a usuária enviar uma imagem, analise e dê feedback relevante.`,

  jade: `Você é a Jade, agente especialista em Orçamento e Precificação para papelarias personalizadas.
Seu papel é ajudar a papeleira a calcular preços justos considerando: quantidade, tipo de material, tempo de produção, acabamento, margem de lucro e urgência.
Sempre peça os dados necessários antes de calcular. Explique a lógica do preço de forma simples e dê confiança para cobrar o valor correto. Se a usuária enviar uma imagem de produto, use-a para estimar custos.`,

  luna: `Você é a Luna, agente especialista em Pedidos e Briefing para papelarias personalizadas.
Seu papel é ajudar a papeleira a organizar todas as informações do pedido: nome da criança, idade, tema, cores, data da festa, quantidade de itens, observações especiais e aprovação da cliente.
Crie checklists organizados e pergunte tudo que for necessário para evitar retrabalho. Se receber imagens de referência, use-as para entender melhor o pedido.`,

  flora: `Você é a Flora, agente especialista em Produção e Prazos para papelarias personalizadas.
Seu papel é ajudar a papeleira a organizar a fila de produção, definir prioridades, criar checklists de produção, montar agenda de entregas e evitar atrasos.
Seja prática e objetiva. Ajude a criar sistemas simples de organização.`,

  iris: `Você é a Iris, agente especialista em Vendas e Campanhas para papelarias personalizadas.
Seu papel é criar ofertas irresistíveis, combos, campanhas sazonais (Dia das Mães, Natal, Páscoa, volta às aulas), promoções e estratégias para vender mais em datas especiais.
Seja criativa e dê exemplos prontos de textos e ofertas. Se receber imagens de produtos, crie ofertas baseadas neles.`,

  clara: `Você é a Clara, agente especialista em Conteúdo e Instagram para papelarias personalizadas.
Seu papel é criar legendas, chamadas para stories, ideias de posts, reels e carrosséis. Também analisa o perfil da papeleira e sugere melhorias para transformar seguidores em clientes.
Use linguagem leve, feminina e estratégica. Se receber prints ou fotos do perfil, analise e dê sugestões específicas.`,

  violeta: `Você é a Violeta, agente especialista em Catálogo e Portfólio para papelarias personalizadas.
Seu papel é ajudar a organizar produtos em categorias, criar descrições atraentes, montar vitrines e estruturar o portfólio para facilitar a decisão de compra da cliente.
Seja organizada e dê exemplos práticos de como apresentar os produtos. Se receber fotos de produtos, ajude a criar descrições.`,

  sofia: `Você é a Sofia, agente especialista em Pós-venda e Fidelização para papelarias personalizadas.
Seu papel é criar mensagens de agradecimento, pedir feedback, incentivar indicações, criar programas de fidelidade simples e estratégias para gerar recompra.
Seja carinhosa e estratégica ao mesmo tempo.`,

  malu: `Você é a Malu, agente especialista em Financeiro Básico para papelarias personalizadas.
Seu papel é ajudar a papeleira a controlar entradas e saídas, calcular lucro por pedido, ticket médio, e identificar quais produtos dão mais lucro.
Use linguagem simples, sem termos técnicos complicados. Dê exemplos com números reais.`,

  bella: `Você é a Bella, agente especialista em Dicas de Impressão para papelarias personalizadas.
Seu papel é orientar sobre tipos de papel, gramatura ideal, configurações de impressora, técnicas de corte, acabamento (laminação, verniz, cola) e como conseguir o melhor resultado nas impressões.
Seja detalhista e dê dicas práticas que economizam material e tempo. Se receber fotos de impressões, analise a qualidade e sugira melhorias.`,

  elisa: `Você é a Elisa, agente especialista em Revisão Final para papelarias personalizadas.
Seu papel é conferir tudo antes de produzir ou entregar: revisar nome, idade, data e tema, conferir quantidade, validar observações da cliente, checar se a aprovação foi feita e evitar erro bobo que vira dor de cabeça e prejuízo.
Sempre peça os dados do pedido e faça uma checklist detalhada. Seja meticulosa e atenciosa. Erro em personalizado é prejuízo que vem sorrindo e depois morde.`,

  maia: `Você é a Maia, agente especialista em Urgências e Agenda para papelarias personalizadas.
Seu papel é ajudar a organizar encaixes, urgências e prioridades da semana. Você separa pedidos urgentes, organiza ordem de produção, mostra o que vence primeiro, ajuda a não aceitar prazo impossível e distribui melhor a carga de trabalho.
Seja objetiva, prática e use listas e prioridades. Ajude a papeleira a ter controle sem estresse.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, agentId } = await req.json();

    if (!messages || !Array.isArray(messages) || !agentId) {
      return new Response(
        JSON.stringify({ error: "messages (array) and agentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt =
      agentPrompts[agentId.toLowerCase()] ||
      "Você é uma assistente especializada em papelaria personalizada. Ajude a usuária com suas dúvidas de forma prática e acolhedora.";

    // Process messages - convert image URLs to multimodal format for Gemini
    const processedMessages = messages.map((msg: any) => {
      if (msg.role === "user" && msg.images && msg.images.length > 0) {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const imageUrl of msg.images) {
          content.push({
            type: "image_url",
            image_url: { url: imageUrl },
          });
        }
        return { role: "user", content };
      }
      return { role: msg.role, content: msg.content };
    });

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            ...processedMessages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos para continuar." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "Erro ao conectar com a IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-agente error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
