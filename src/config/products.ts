export type ProductMode = "suite" | "gerador-moldes" | "escola-agentes";

export type ProductFeature =
  | "generator"
  | "agent-school"
  | "billing"
  | "admin-moldes"
  | "admin-assinaturas";

export interface ProductProfile {
  mode: ProductMode;
  appName: string;
  wordmark: {
    primary: string;
    accent: string;
  };
  badge: string;
  headline: string;
  headlineAccent: string;
  description: string;
  primaryCta: {
    label: string;
    path: string;
  };
  secondaryCta: {
    label: string;
    path: string;
  };
  features: ProductFeature[];
}

const modeAliases: Record<string, ProductMode> = {
  "": "suite",
  suite: "suite",
  "arte-magica": "suite",
  "arte-m-gica": "suite",
  gerador: "gerador-moldes",
  moldes: "gerador-moldes",
  "gerador-moldes": "gerador-moldes",
  escola: "escola-agentes",
  agentes: "escola-agentes",
  "escola-agentes": "escola-agentes",
};

export const productProfiles: Record<ProductMode, ProductProfile> = {
  suite: {
    mode: "suite",
    appName: "Arte Magica",
    wordmark: {
      primary: "Arte",
      accent: "Magica",
    },
    badge: "Suite para papelaria personalizada",
    headline: "Moldes automaticos e agentes para",
    headlineAccent: "artesas crescerem.",
    description:
      "Crie artes prontas para imprimir e converse com agentes especialistas para vender, organizar e produzir melhor.",
    primaryCta: {
      label: "Criar um molde",
      path: "/editor",
    },
    secondaryCta: {
      label: "Ver agentes",
      path: "/agentes",
    },
    features: ["generator", "agent-school", "billing", "admin-moldes", "admin-assinaturas"],
  },
  "gerador-moldes": {
    mode: "gerador-moldes",
    appName: "MoldePronto",
    wordmark: {
      primary: "Molde",
      accent: "Pronto",
    },
    badge: "Gerador de moldes automaticos",
    headline: "Artes no molde certo,",
    headlineAccent: "prontas para imprimir.",
    description:
      "Escolha o molde, aplique o tema, personalize nome e detalhes, baixe o molde em SVG, PNG ou PDF e, se precisar, gere a divulgação em PNG ou JPG.",
    primaryCta: {
      label: "Gerar molde agora",
      path: "/editor",
    },
    secondaryCta: {
      label: "Ver moldes",
      path: "/moldes",
    },
    features: ["generator", "billing", "admin-moldes", "admin-assinaturas"],
  },
  "escola-agentes": {
    mode: "escola-agentes",
    appName: "Meu Ateliê Digital",
    wordmark: {
      primary: "Meu Ateliê",
      accent: " Digital",
    },
    badge: "Seu time de assistentes de IA",
    headline: "Um time de IA pronto para",
    headlineAccent: "ajudar seu ateliê hoje.",
    description:
      "Peça o que precisa e receba mensagens, orçamentos, campanhas, conteúdo, revisões e planos de ação em poucos minutos.",
    primaryCta: {
      label: "Escolher uma assistente",
      path: "/agentes",
    },
    secondaryCta: {
      label: "Ver rotinas práticas",
      path: "/trilhas",
    },
    features: ["agent-school", "billing", "admin-assinaturas"],
  },
};

export function resolveProductMode(value: string | undefined): ProductMode {
  const normalized = (value ?? "").trim().toLowerCase();
  return modeAliases[normalized] ?? "suite";
}

export const productMode = resolveProductMode(import.meta.env.VITE_PRODUCT);
export const activeProduct = productProfiles[productMode];

export function hasProductFeature(feature: ProductFeature): boolean {
  return activeProduct.features.includes(feature);
}
