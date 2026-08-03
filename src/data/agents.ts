export const agentIds = [
  "nina",
  "iris",
  "clara",
  "violeta",
  "sofia",
  "bella",
  "cora",
  "elisa",
  "maia",
] as const;

export type AgentId = (typeof agentIds)[number];

export interface Agent {
  id: AgentId;
  name: string;
  title: string;
  description: string;
  deliverables: readonly string[];
  starters: readonly string[];
}

export const agents: Agent[] = [
  {
    id: "nina",
    name: "Nina",
    title: "Atendimento e Fechamento",
    description:
      "Prepara respostas para WhatsApp e Instagram, contorna objeções e conduz a cliente até o fechamento com clareza.",
    deliverables: ["Resposta pronta", "Quebra de objeção", "Próximo passo da venda"],
    starters: [
      "Crie uma resposta para uma cliente que achou caro.",
      "Monte minha mensagem de boas-vindas no WhatsApp.",
      "Ajude a fechar este pedido sem pressionar a cliente.",
    ],
  },
  {
    id: "iris",
    name: "Iris",
    title: "Vendas e Campanhas",
    description:
      "Cria ofertas, combos, promoções e campanhas sazonais para vender melhor em cada data estratégica.",
    deliverables: ["Oferta completa", "Campanha por canal", "Calendário de ação"],
    starters: [
      "Crie uma campanha para a próxima data comemorativa.",
      "Monte três combos para aumentar meu ticket médio.",
      "Preciso de uma promoção sem desvalorizar meu trabalho.",
    ],
  },
  {
    id: "clara",
    name: "Clara",
    title: "Conteúdo e Instagram",
    description:
      "Transforma produtos e bastidores em legendas, posts, reels e stories que aproximam seguidoras e clientes.",
    deliverables: ["Legenda pronta", "Roteiro de reel", "Sequência de stories"],
    starters: [
      "Crie uma legenda para divulgar um produto meu.",
      "Planeje uma semana de conteúdo para meu objetivo.",
      "Crie um roteiro de reel mostrando meu processo.",
    ],
  },
  {
    id: "violeta",
    name: "Violeta",
    title: "Catálogo e Portfólio",
    description:
      "Organiza produtos, categorias, nomes e descrições para a cliente entender a vitrine e decidir com mais facilidade.",
    deliverables: ["Categorias da vitrine", "Descrição de produto", "Ordem do catálogo"],
    starters: [
      "Organize meu catálogo por categorias.",
      "Crie descrições que valorizem estes produtos.",
      "Monte a ordem ideal da minha vitrine digital.",
    ],
  },
  {
    id: "sofia",
    name: "Sofia",
    title: "Pós-venda e Fidelização",
    description:
      "Cria mensagens após a entrega, pedidos de feedback, indicações e ações para a mesma cliente comprar novamente.",
    deliverables: ["Mensagem pós-entrega", "Pedido de feedback", "Ação de recompra"],
    starters: [
      "Crie uma mensagem carinhosa para depois da entrega.",
      "Como pedir foto e avaliação sem incomodar?",
      "Monte uma campanha para reativar clientes antigas.",
    ],
  },
  {
    id: "bella",
    name: "Bella",
    title: "Impressão e Acabamento",
    description:
      "Orienta papel, gramatura, impressora, corte e acabamento e pesquisa o manual correto quando a configuração é específica.",
    deliverables: ["Diagnóstico técnico", "Configuração segura", "Passo a passo de acabamento"],
    starters: [
      "Qual papel devo usar neste personalizado?",
      "Minha impressão está com a cor errada. O que verifico?",
      "Pesquise a configuração correta para minha impressora.",
    ],
  },
  {
    id: "cora",
    name: "Cora",
    title: "Curadoria de Moldes e Artes",
    description:
      "Analisa o molde aberto e a peça montada, compara com o padrão Alice e com o mercado e aponta exatamente o que precisa ser corrigido.",
    deliverables: ["Status e nota técnica", "Bloqueios de qualidade", "Correções prioritárias"],
    starters: [
      "Revise este molde aberto antes de eu imprimir.",
      "Compare esta caixa montada com o padrão Alice.",
      "Diga se esta arte está pronta para vender ou precisa ser refeita.",
    ],
  },
  {
    id: "elisa",
    name: "Elisa",
    title: "Revisão Final",
    description:
      "Confere dados, quantidades, observações, arte e aprovação da cliente antes de produzir ou entregar.",
    deliverables: ["Status da revisão", "Pendências encontradas", "Checklist de liberação"],
    starters: [
      "Revise este pedido antes de eu produzir.",
      "Crie um checklist de aprovação da cliente.",
      "Confira esta arte e liste qualquer risco de erro.",
    ],
  },
  {
    id: "maia",
    name: "Maia",
    title: "Urgências e Agenda",
    description:
      "Organiza pedidos, encaixes e prioridades com prazos realistas para proteger a produção e a relação com a cliente.",
    deliverables: ["Ordem de prioridade", "Agenda executável", "Mensagem sobre prazo"],
    starters: [
      "Organize meus pedidos desta semana por prioridade.",
      "Veja se consigo aceitar este pedido urgente.",
      "Crie uma mensagem para recusar um prazo impossível.",
    ],
  },
];

const legacyAgentIds: Record<string, AgentId> = {
  malu: "nina",
  jade: "nina",
  luna: "elisa",
  flora: "maia",
};

export function getCanonicalAgentId(id: string): AgentId | undefined {
  const key = id.trim().toLowerCase();
  if ((agentIds as readonly string[]).includes(key)) return key as AgentId;
  return legacyAgentIds[key];
}

export function getAgentById(id: string): Agent | undefined {
  const canonicalId = getCanonicalAgentId(id);
  return agents.find((agent) => agent.id === canonicalId);
}
