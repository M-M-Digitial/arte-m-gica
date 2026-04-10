export interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  emoji: string;
}

export const agents: Agent[] = [
  {
    id: "nina",
    name: "Nina",
    title: "Atendimento e Fechamento",
    description: "Cuida das respostas no WhatsApp e Instagram, quebra objeções, passa confiança, responde dúvidas e ajuda a fechar pedidos.",
    emoji: "💬",
  },
  {
    id: "jade",
    name: "Jade",
    title: "Orçamento e Precificação",
    description: "Monta orçamento e calcula preço com base em quantidade, material, tempo, acabamento, lucro e urgência.",
    emoji: "💎",
  },
  {
    id: "luna",
    name: "Luna",
    title: "Pedidos e Briefing",
    description: "Organiza tudo o que precisa entrar no pedido: nome, idade, tema, cores, data, quantidade, observações e aprovação da cliente.",
    emoji: "📋",
  },
  {
    id: "flora",
    name: "Flora",
    title: "Produção e Prazos",
    description: "Organiza fila de produção, prioridade, checklist, agenda de entregas e evita atraso ou promessa furada.",
    emoji: "📅",
  },
  {
    id: "iris",
    name: "Iris",
    title: "Vendas e Campanhas",
    description: "Cria ofertas, combos, campanhas sazonais, promoções e ideias para vender mais em datas estratégicas.",
    emoji: "🚀",
  },
  {
    id: "clara",
    name: "Clara",
    title: "Conteúdo e Instagram",
    description: "Cria legendas, chamadas, ideias de posts e analisa perfil para transformar seguidores em clientes.",
    emoji: "📱",
  },
  {
    id: "violeta",
    name: "Violeta",
    title: "Catálogo e Portfólio",
    description: "Organiza os produtos, categorias, descrições e vitrine para facilitar a decisão de compra da cliente.",
    emoji: "🛍️",
  },
  {
    id: "sofia",
    name: "Sofia",
    title: "Pós-venda e Fidelização",
    description: "Envia mensagens depois da entrega, pede feedback, incentiva indicação e puxa recompra.",
    emoji: "💖",
  },
  {
    id: "malu",
    name: "Malu",
    title: "Financeiro Básico",
    description: "Acompanha entradas, saídas, lucro por pedido, ticket médio e mostra quais produtos valem mais a pena.",
    emoji: "💰",
  },
  {
    id: "bella",
    name: "Bella",
    title: "Dicas de Impressão",
    description: "Dá dicas de papel, gramatura, impressora, corte e acabamento para seus personalizados ficarem perfeitos.",
    emoji: "🖨️",
  },
];

export function getAgentById(id: string): Agent | undefined {
  return agents.find((a) => a.id === id);
}
