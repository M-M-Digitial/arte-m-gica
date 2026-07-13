export interface Agent {
  id: string;
  name: string;
  title: string;
  description: string;
  emoji: string;
}

// Elenco enxuto: 8 especialistas (as antigas Malu, Elisa, Maia e Violeta
// foram incorporadas por Jade, Luna, Flora e Iris, respectivamente).
export const agents: Agent[] = [
  {
    id: "nina",
    name: "Nina",
    title: "Atendimento e Fechamento",
    description: "Responde WhatsApp e Instagram por você: scripts prontos, quebra de objeções ('tá caro', 'vou pensar') e técnicas pra fechar a venda sem ser chata.",
    emoji: "💬",
  },
  {
    id: "jade",
    name: "Jade",
    title: "Preço e Financeiro",
    description: "Calcula o preço certo de cada peça (material + seu tempo + lucro), monta orçamentos e acompanha seu caixa: lucro por pedido, ticket médio e ponto de equilíbrio.",
    emoji: "💎",
  },
  {
    id: "luna",
    name: "Luna",
    title: "Pedidos sem Erro",
    description: "Organiza o briefing completo (nome com grafia exata, tema, cores, data) e revisa tudo antes de produzir e entregar — zero nome errado, zero prejuízo.",
    emoji: "📋",
  },
  {
    id: "flora",
    name: "Flora",
    title: "Produção e Agenda",
    description: "Monta sua semana de produção: fila por prioridade, prazos realistas, encaixes de urgência (com taxa!) e quando dizer não pra não surtar.",
    emoji: "📅",
  },
  {
    id: "iris",
    name: "Iris",
    title: "Vendas e Vitrine",
    description: "Cria campanhas e combos pra datas fortes, e arruma sua vitrine: catálogo organizado, descrições que vendem e nomes de kit que valorizam o produto.",
    emoji: "🚀",
  },
  {
    id: "clara",
    name: "Clara",
    title: "Conteúdo e Instagram",
    description: "Legendas prontas, ideias de reels e stories, calendário de posts e análise do seu perfil pra transformar seguidoras em clientes.",
    emoji: "📱",
  },
  {
    id: "sofia",
    name: "Sofia",
    title: "Pós-venda e Fidelização",
    description: "Mensagens pós-entrega, pedidos de foto da festa (prova social!), programa de indicação e reativação de clientes sumidas.",
    emoji: "💖",
  },
  {
    id: "bella",
    name: "Bella",
    title: "Impressão e Materiais",
    description: "Papel certo, gramatura, configuração da impressora, corte e acabamento — e socorro quando a impressão sai borrada ou com cor errada.",
    emoji: "🖨️",
  },
];

// Conversas antigas podem referenciar agentes fundidos — redireciona pro sucessor.
const merged: Record<string, string> = {
  malu: "jade",
  elisa: "luna",
  maia: "flora",
  violeta: "iris",
};

export function getAgentById(id: string): Agent | undefined {
  const key = id.toLowerCase();
  return agents.find((a) => a.id === key) ?? agents.find((a) => a.id === merged[key]);
}
