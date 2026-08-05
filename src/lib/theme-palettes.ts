export interface ThemePalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

const DEFAULT_THEME_PALETTES: Record<string, ThemePalette> = {
  "a-bela-e-a-fera": {
    primary: "#214A96",
    secondary: "#F2C84B",
    background: "#FFF2B8",
    accent: "#C92F43",
  },
  "baby-shark-azul": {
    primary: "#1E64B7",
    secondary: "#58B9E8",
    background: "#DDF3FF",
    accent: "#FFD21F",
  },
  "baby-shark-rosa": {
    primary: "#F23E9D",
    secondary: "#F78FC4",
    background: "#FFE2F1",
    accent: "#FFD21F",
  },
};

const THEME_HERO_ROLE_OVERRIDES: Record<string, string> = {
  "baby-shark-azul": "amigo",
  "baby-shark-rosa": "amigo2",
};

const THEME_COVER_SCALE_OVERRIDES: Record<string, number> = {
  "arca-de-noe": 1.65,
};

export function getDefaultThemePalette(themeSlug: string): ThemePalette | undefined {
  return DEFAULT_THEME_PALETTES[themeSlug];
}

export function getThemeHeroRole(themeSlug: string): string {
  return THEME_HERO_ROLE_OVERRIDES[themeSlug] ?? "principal";
}

export function getThemeCoverScale(themeSlug: string): number {
  return THEME_COVER_SCALE_OVERRIDES[themeSlug] ?? 1;
}
