// Modelo de cobrança do MoldePronto (v1 — assinatura via Hotmart)
//
// Racional: o Compositor tem custo marginal ZERO (roda no navegador) → ilimitado.
// O "Criar com IA" tem custo real por arte (gpt-image) → cota justa por mês.
// Agentes usam modelo barato (gpt-4o-mini) → uso livre dentro do razoável.
//
// ⚠️ Troque HOTMART_CHECKOUT_URL pelo link real do produto na Hotmart.
export const HOTMART_CHECKOUT_URL = "https://pay.hotmart.com/SEU_PRODUTO";

export const PLANOS = [
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
] as const;

export const BENEFICIOS = [
  "Compositor de Kits ILIMITADO — 100+ temas, 21 moldes",
  "Arquivos SVG editáveis (Canva) + PNG + PDF pra imprimir",
  "Criar com IA: 30 artes exclusivas por mês",
  "8 agentes especialistas do seu negócio, sem limite",
  "Novos temas e moldes toda semana",
  "Suporte e comunidade de papeleiras",
] as const;
