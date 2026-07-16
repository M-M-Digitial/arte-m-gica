import { productMode } from "@/config/products";

const isAgentProduct = productMode === "escola-agentes";

export const HOTMART_CHECKOUT_URL =
  import.meta.env.VITE_HOTMART_CHECKOUT_URL || "https://pay.hotmart.com/SEU_PRODUTO";

export function isCheckoutUrlConfigured(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !parsed.pathname.includes("SEU_PRODUTO");
  } catch {
    return false;
  }
}

export const PLANOS = isAgentProduct
  ? [
      {
        id: "vitalicio",
        nome: "Acesso vitalício",
        preco: "9x de R$ 9,21",
        periodo: " ou R$ 67 à vista",
        economia: "Pagamento único",
        destaque: true,
      },
    ]
  : [
      {
        id: "mensal",
        nome: "Mensal",
        preco: "R$ 39,90",
        periodo: "/mês",
        destaque: false,
      },
      {
        id: "anual",
        nome: "Anual",
        preco: "R$ 349",
        periodo: "/ano",
        economia: "2 meses grátis",
        destaque: true,
      },
    ];

export const BENEFICIOS = isAgentProduct
  ? [
      "Nove assistentes especializadas para o ateliê",
      "Atendimento, orçamento, vendas e conteúdo",
      "Catálogo, pós-venda, impressão e revisão",
      "Agenda, urgências e histórico de conversas",
      "Memória do seu negócio em cada atendimento",
      "Acesso vitalício com pagamento único",
    ]
  : [
      "Compositor de kits ilimitado",
      "Arquivos SVG, PNG e PDF para imprimir",
      "Criação de artes exclusivas com IA",
      "Biblioteca de temas e moldes",
      "Novos conteúdos para produção",
      "Suporte para sua operação",
    ];

export const BILLING_COPY = isAgentProduct
  ? {
      eyebrow: "Acesso exclusivo",
      headline: "Seu time completo no Meu Ateliê Digital",
      description:
        "Tenha apoio para atender, precificar, divulgar, revisar e organizar seu ateliê sempre que precisar.",
      action: "Quero acessar agora",
      security: "Compra segura pela Hotmart · 7 dias de garantia · Acesso enviado por e-mail",
    }
  : {
      eyebrow: "Área exclusiva de assinantes",
      headline: "Artes profissionais prontas para produzir",
      description: "Crie e personalize seus moldes em um fluxo rápido, do tema ao arquivo final.",
      action: "Assinar agora",
      security: "Pagamento seguro pela Hotmart · Acesso enviado por e-mail",
    };
