import generatedThemePalettes from "../data/theme-palettes.generated.json";

export interface ThemePalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  appearance?: "balanced" | "vibrant" | "elegant";
}

const CURATED_THEME_PALETTES: Record<string, ThemePalette> = {
  "a-bela-e-a-fera": {
    primary: "#214A96",
    secondary: "#F2C84B",
    background: "#FFF2B8",
    accent: "#C92F43",
  },
  "a-era-do-gelo": {
    primary: "#1E6AA8",
    secondary: "#65C8E8",
    background: "#EAF8FF",
    accent: "#8A5738",
  },
  "arca-de-noe": {
    primary: "#287A68",
    secondary: "#F2B63D",
    background: "#FFF5DC",
    accent: "#E97891",
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
  "bob-esponja": {
    primary: "#E8B91E",
    secondary: "#2EAFBC",
    background: "#FFF6C7",
    accent: "#8F5A2A",
  },
  "confeitaria": {
    primary: "#C9467A",
    secondary: "#E9B33D",
    background: "#FFF4F8",
    accent: "#4FAEB7",
  },
  "dragon-ball-z": {
    primary: "#E9671B",
    secondary: "#2D63B4",
    background: "#FFF0CC",
    accent: "#F2C62E",
  },
  "frozen": {
    primary: "#2E67B1",
    secondary: "#78D5EE",
    background: "#EDF8FF",
    accent: "#8D6CB8",
  },
  "mickey": {
    primary: "#D9232E",
    secondary: "#F2C21A",
    background: "#FFF7DF",
    accent: "#191919",
  },
  "minions": {
    primary: "#E9C91D",
    secondary: "#3477B8",
    background: "#FFF8C9",
    accent: "#39434A",
  },
};

const DEFAULT_THEME_PALETTES: Record<string, ThemePalette> = {
  ...(generatedThemePalettes as Record<string, ThemePalette>),
  ...CURATED_THEME_PALETTES,
};

const THEME_HERO_ROLE_OVERRIDES: Record<string, string> = {
  "baby-shark-azul": "amigo",
  "baby-shark-rosa": "amigo2",
};

const THEME_COVER_SCALE_OVERRIDES: Record<string, number> = {
  "arca-de-noe": 1.65,
};

const BABY_SHARK_PALETTE_VARIANTS: Record<string, Record<string, ThemePalette>> = {
  "baby-shark-azul": {
    vibrante: { primary: "#1677C8", secondary: "#FFD23F", background: "#28BFE0", accent: "#32B56A", appearance: "vibrant" },
    elegante: { primary: "#24588F", secondary: "#D7B34A", background: "#EAF6FB", accent: "#3A7C78", appearance: "elegant" },
    pastel: { primary: "#4C84C4", secondary: "#F4CA58", background: "#EAF7FF", accent: "#70B8AD" },
    aventura: { primary: "#245F7A", secondary: "#E4A82B", background: "#E7F4F6", accent: "#3B8F68" },
    magica: { primary: "#405FB0", secondary: "#B983CB", background: "#EDF3FF", accent: "#E7B93F" },
  },
  "baby-shark-rosa": {
    vibrante: { primary: "#E83E8C", secondary: "#FFD23F", background: "#F279B5", accent: "#39BFC2", appearance: "vibrant" },
    elegante: { primary: "#A83E6F", secondary: "#D7B34A", background: "#FFF0F6", accent: "#4E827D", appearance: "elegant" },
    pastel: { primary: "#D86A9F", secondary: "#F4CA58", background: "#FFF0F6", accent: "#76B8AD" },
    aventura: { primary: "#9B3E68", secondary: "#E4A82B", background: "#FBEAF1", accent: "#3B8F68" },
    magica: { primary: "#B44788", secondary: "#8B74C9", background: "#FFF0FA", accent: "#E7B93F" },
  },
};

const clamp = (value: number, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const parseHex = (hex: string) => {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return { h: 334, s: 0.68, l: 0.53 };
  const [red, green, blue] = [0, 2, 4]
    .map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta === 0) return { h: 0, s: 0, l: lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue = maximum === red
    ? 60 * (((green - blue) / delta) % 6)
    : maximum === green
      ? 60 * ((blue - red) / delta + 2)
      : 60 * ((red - green) / delta + 4);
  return { h: (hue + 360) % 360, s: saturation, l: lightness };
};

const hslToHex = (hue: number, saturation: number, lightness: number) => {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation);
  const l = clamp(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const offset = l - chroma / 2;
  const channels = h < 60 ? [chroma, x, 0]
    : h < 120 ? [x, chroma, 0]
      : h < 180 ? [0, chroma, x]
        : h < 240 ? [0, x, chroma]
          : h < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  return `#${channels.map((channel) => Math.round((channel + offset) * 255)
    .toString(16).padStart(2, "0")).join("")}`.toUpperCase();
};

const tune = (
  color: string,
  settings: { hue?: number; minS?: number; maxS?: number; minL?: number; maxL?: number },
) => {
  const hsl = parseHex(color);
  const saturation = clamp(hsl.s, settings.minS ?? 0, settings.maxS ?? 1);
  const lightness = clamp(hsl.l, settings.minL ?? 0, settings.maxL ?? 1);
  return hslToHex(hsl.h + (settings.hue ?? 0), saturation, lightness);
};

function buildThemeVariant(base: ThemePalette, paletteId: string): ThemePalette | undefined {
  if (paletteId === "vibrante") {
    const backgroundHsl = parseHex(base.background);
    const primaryHsl = parseHex(base.primary);
    const backgroundHue = backgroundHsl.s < 0.12 ? primaryHsl.h : backgroundHsl.h;
    return {
      primary: tune(base.primary, { minS: primaryHsl.s < 0.12 ? 0 : 0.72, maxS: 0.92, minL: 0.36, maxL: 0.52 }),
      secondary: tune(base.secondary, { minS: 0.68, maxS: 0.94, minL: 0.48, maxL: 0.62 }),
      background: hslToHex(backgroundHue, Math.max(0.54, backgroundHsl.s), 0.72),
      accent: tune(base.accent, { minS: 0.64, maxS: 0.92, minL: 0.40, maxL: 0.58 }),
      appearance: "vibrant",
    };
  }
  if (paletteId === "elegante") {
    const primary = parseHex(base.primary);
    return {
      primary: tune(base.primary, { minS: primary.s < 0.12 ? 0 : 0.30, maxS: 0.56, minL: 0.22, maxL: 0.36 }),
      secondary: tune(base.secondary, { minS: 0.28, maxS: 0.62, minL: 0.46, maxL: 0.60 }),
      background: tune(base.background, { maxS: 0.24, minL: 0.93, maxL: 0.97 }),
      accent: tune(base.accent, { minS: 0.20, maxS: 0.48, minL: 0.28, maxL: 0.42 }),
      appearance: "elegant",
    };
  }
  if (paletteId === "pastel") {
    return {
      primary: tune(base.primary, { minS: 0.38, maxS: 0.62, minL: 0.62, maxL: 0.72 }),
      secondary: tune(base.secondary, { minS: 0.34, maxS: 0.58, minL: 0.68, maxL: 0.78 }),
      background: tune(base.background, { maxS: 0.30, minL: 0.95, maxL: 0.98 }),
      accent: tune(base.accent, { minS: 0.32, maxS: 0.58, minL: 0.62, maxL: 0.72 }),
    };
  }
  if (paletteId === "aventura") {
    return {
      primary: tune(base.primary, { minS: 0.38, maxS: 0.70, minL: 0.25, maxL: 0.36 }),
      secondary: tune(base.secondary, { minS: 0.52, maxS: 0.82, minL: 0.48, maxL: 0.60 }),
      background: tune(base.background, { maxS: 0.28, minL: 0.90, maxL: 0.95 }),
      accent: tune(base.accent, { minS: 0.44, maxS: 0.74, minL: 0.38, maxL: 0.50 }),
    };
  }
  if (paletteId === "magica") {
    return {
      primary: tune(base.primary, { hue: 12, minS: 0.48, maxS: 0.76, minL: 0.38, maxL: 0.50 }),
      secondary: tune(base.accent, { hue: -12, minS: 0.42, maxS: 0.70, minL: 0.58, maxL: 0.68 }),
      background: tune(base.background, { minS: 0.18, maxS: 0.36, minL: 0.94, maxL: 0.97 }),
      accent: tune(base.secondary, { minS: 0.52, maxS: 0.80, minL: 0.48, maxL: 0.60 }),
    };
  }
  return undefined;
}

export function getDefaultThemePalette(themeSlug: string): ThemePalette | undefined {
  return DEFAULT_THEME_PALETTES[themeSlug];
}

export function adaptThemePalette(
  themeSlug: string,
  palette: ThemePalette,
  paletteId: string,
  themePalette?: ThemePalette,
): ThemePalette {
  if (paletteId === "tema") return DEFAULT_THEME_PALETTES[themeSlug] ?? palette;
  if (paletteId === "personalizada") return palette;
  return BABY_SHARK_PALETTE_VARIANTS[themeSlug]?.[paletteId]
    ?? buildThemeVariant(themePalette ?? DEFAULT_THEME_PALETTES[themeSlug] ?? palette, paletteId)
    ?? palette;
}

export function getThemeHeroRole(themeSlug: string): string {
  return THEME_HERO_ROLE_OVERRIDES[themeSlug] ?? "principal";
}

export function getThemeCoverScale(themeSlug: string): number {
  return THEME_COVER_SCALE_OVERRIDES[themeSlug] ?? 1;
}
