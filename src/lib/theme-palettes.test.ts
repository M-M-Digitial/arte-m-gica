import { describe, expect, it } from "vitest";
import generatedThemePalettes from "../data/theme-palettes.generated.json";
import { adaptThemePalette, getDefaultThemePalette, getThemeCoverScale, getThemeHeroRole } from "./theme-palettes";

describe("default theme palettes", () => {
  it("usa cores infantis coordenadas na Bela e a Fera", () => {
    expect(getDefaultThemePalette("a-bela-e-a-fera")).toEqual({
      primary: "#214A96",
      secondary: "#F2C84B",
      background: "#FFF2B8",
      accent: "#C92F43",
    });
  });

  it("não força paleta em temas sem curadoria específica", () => {
    expect(getDefaultThemePalette("tema-sem-override")).toBeUndefined();
    expect(Object.keys(generatedThemePalettes)).toHaveLength(100);
    expect(getDefaultThemePalette("sonic")).toBeDefined();
  });

  it("mantem as capas azul e rosa corretas do Baby Shark", () => {
    expect(getThemeHeroRole("baby-shark-azul")).toBe("amigo");
    expect(getThemeHeroRole("baby-shark-rosa")).toBe("amigo2");
  });

  it("preserva a identidade azul e rosa nas variacoes de paleta", () => {
    const genericVibrant = {
      primary: "#E6005C",
      secondary: "#FFD000",
      background: "#29C7D8",
      accent: "#35B84A",
      appearance: "vibrant" as const,
    };
    expect(adaptThemePalette("baby-shark-azul", genericVibrant, "vibrante")).toMatchObject({
      primary: "#1677C8",
      background: "#28BFE0",
    });
    expect(adaptThemePalette("baby-shark-rosa", genericVibrant, "vibrante")).toMatchObject({
      primary: "#E83E8C",
      background: "#F279B5",
    });
    expect(adaptThemePalette("baby-shark-rosa", genericVibrant, "personalizada")).toBe(genericVibrant);
  });

  it("deriva vibrante e elegante das cores do proprio tema", () => {
    const genericVibrant = {
      primary: "#E6005C",
      secondary: "#FFD000",
      background: "#29C7D8",
      accent: "#35B84A",
      appearance: "vibrant" as const,
    };
    const iceVibrant = adaptThemePalette("a-era-do-gelo", genericVibrant, "vibrante");
    const beautyElegant = adaptThemePalette("a-bela-e-a-fera", genericVibrant, "elegante");

    expect(iceVibrant.appearance).toBe("vibrant");
    expect(iceVibrant.primary).not.toBe(genericVibrant.primary);
    expect(iceVibrant.background).not.toBe(genericVibrant.background);
    expect(beautyElegant.appearance).toBe("elegant");
    expect(beautyElegant.primary).not.toBe(genericVibrant.primary);
  });

  it("corrige capas cujo arquivo traz margem interna opaca", () => {
    expect(getThemeCoverScale("arca-de-noe")).toBe(1.65);
    expect(getThemeCoverScale("safari")).toBe(1);
  });
});
