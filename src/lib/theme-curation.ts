export interface CuratableThemeAsset {
  kind: string;
  role: string;
  url?: string | null;
  meta?: {
    usage?: string;
    enabled?: boolean;
    w?: number;
    h?: number;
    [key: string]: unknown;
  } | null;
}

export interface ThemeReadiness {
  ready: boolean;
  commercialReady: boolean;
  reasons: string[];
  warnings: string[];
  counts: {
    heroes: number;
    papers: number;
    fonts: number;
  };
}

const DECORATIVE_ROLE = /placa|ornamento|decoracao|borda|border|faixa|painel|panel/;

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function isThemeHeroAsset(asset: CuratableThemeAsset): boolean {
  if (asset.kind !== "clipart" || !asset.url || asset.meta?.enabled === false) return false;
  if (asset.meta?.usage) return asset.meta.usage === "hero";
  if (DECORATIVE_ROLE.test(normalize(asset.role))) return false;
  const ratio = asset.meta?.w && asset.meta?.h ? asset.meta.w / asset.meta.h : 1;
  return ratio < 2.15;
}

export function getThemeReadiness(assets: CuratableThemeAsset[]): ThemeReadiness {
  const active = assets.filter((asset) => Boolean(asset.url) && asset.meta?.enabled !== false);
  const heroes = active.filter(isThemeHeroAsset);
  const heroUrls = new Set(heroes.map((asset) => asset.url));
  const papers = new Set(
    active
      .filter((asset) => asset.kind === "papel" && (asset.role === "top" || asset.role === "body"))
      .map((asset) => asset.role),
  );
  const fonts = active.filter((asset) => asset.kind === "fonte");
  const reasons: string[] = [];
  const warnings: string[] = [];

  if (!heroes.some((asset) => asset.role === "principal")) reasons.push("personagem principal ausente");
  if (heroUrls.size < 2) reasons.push("menos de dois personagens distintos");
  if (heroUrls.size >= 2 && heroUrls.size < 4) warnings.push("menos de quatro personagens distintos para as quatro faces");
  if (!papers.has("top")) reasons.push("papel superior ausente");
  if (!papers.has("body")) reasons.push("papel do corpo ausente");
  if (fonts.length === 0) reasons.push("fonte do tema ausente");

  return {
    ready: reasons.length === 0,
    commercialReady: reasons.length === 0 && warnings.length === 0,
    reasons,
    warnings,
    counts: { heroes: heroUrls.size, papers: papers.size, fonts: fonts.length },
  };
}

export function assertThemeReadyForComposition(assets: CuratableThemeAsset[]): void {
  const readiness = getThemeReadiness(assets);
  if (!readiness.ready) {
    throw new Error(`Tema incompleto: ${readiness.reasons.join(", ")}.`);
  }
}
