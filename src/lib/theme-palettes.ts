export interface ThemePalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

const DEFAULT_THEME_PALETTES: Record<string, ThemePalette> = {
  "a-bela-e-a-fera": {
    primary: "#2563B8",
    secondary: "#F2C94C",
    background: "#FFF0B8",
    accent: "#F04E7A",
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

export function getDefaultThemePalette(themeSlug: string): ThemePalette | undefined {
  return DEFAULT_THEME_PALETTES[themeSlug];
}
