import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getThemeReadiness, isThemeHeroAsset } from "@/lib/theme-curation";
import { getDefaultThemePalette, getThemeHeroRole, type ThemePalette } from "@/lib/theme-palettes";

interface ThemeAssetRow {
  theme_slug: string;
  kind: string;
  url: string;
  role: string;
  meta?: {
    cor?: string;
    cor2?: string;
    usage?: string;
    enabled?: boolean;
    w?: number;
    h?: number;
  } | null;
}

export interface ThemeLibraryCard {
  slug: string;
  name: string;
  cover: string;
  paper: string;
  palette: ThemePalette;
  heroCount: number;
}

const validColor = (value: unknown, fallback: string) =>
  typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;

const lighten = (hex: string, amount: number) => {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return "#FFF6F9";
  const channel = (offset: number) => {
    const current = Number.parseInt(value.slice(offset, offset + 2), 16);
    return Math.round(current + (255 - current) * amount).toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(2)}${channel(4)}`;
};

export function buildThemeLibraryCards(
  assets: ThemeAssetRow[],
  names: Array<{ slug: string; name: string }>,
): ThemeLibraryCard[] {
  const assetsBySlug = new Map<string, ThemeAssetRow[]>();
  for (const asset of assets) {
    const grouped = assetsBySlug.get(asset.theme_slug) ?? [];
    grouped.push(asset);
    assetsBySlug.set(asset.theme_slug, grouped);
  }

  return names.flatMap((theme) => {
    const grouped = assetsBySlug.get(theme.slug) ?? [];
    const readiness = getThemeReadiness(grouped);
    if (!readiness.ready) return [];

    const active = grouped.filter((asset) => asset.url && asset.meta?.enabled !== false);
    const heroes = active.filter((asset) => isThemeHeroAsset(asset));
    const preferredRole = getThemeHeroRole(theme.slug);
    const cover = heroes.find((asset) => asset.role === preferredRole)
      ?? heroes.find((asset) => asset.role === "principal")
      ?? heroes[0];
    const paper = active.find((asset) => asset.kind === "papel" && asset.role === "body")
      ?? active.find((asset) => asset.kind === "papel" && asset.role === "top");
    const font = active.find((asset) => asset.kind === "fonte");
    if (!cover?.url || !paper?.url) return [];

    const primary = validColor(font?.meta?.cor, "#D93680");
    const secondary = validColor(font?.meta?.cor2, "#F2A900");
    const palette = getDefaultThemePalette(theme.slug) ?? {
      primary,
      secondary,
      background: lighten(primary, 0.86),
      accent: secondary,
    };

    return [{
      slug: theme.slug,
      name: theme.name,
      cover: cover.url,
      paper: paper.url,
      palette,
      heroCount: readiness.counts.heroes,
    }];
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}

export function useThemeLibrary() {
  return useQuery({
    queryKey: ["curated-theme-library"],
    queryFn: async () => {
      const [{ data: assets, error: assetsError }, { data: names, error: namesError }] = await Promise.all([
        supabase.from("tema_assets").select("theme_slug,kind,url,role,meta"),
        supabase.from("modelos_prontos_temas").select("slug,name"),
      ]);
      if (assetsError) throw assetsError;
      if (namesError) throw namesError;
      return buildThemeLibraryCards((assets ?? []) as ThemeAssetRow[], names ?? []);
    },
  });
}
