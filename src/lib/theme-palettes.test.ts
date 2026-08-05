import { describe, expect, it } from "vitest";
import { getDefaultThemePalette, getThemeCoverScale, getThemeHeroRole } from "./theme-palettes";

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
  });

  it("mantem as capas azul e rosa corretas do Baby Shark", () => {
    expect(getThemeHeroRole("baby-shark-azul")).toBe("amigo");
    expect(getThemeHeroRole("baby-shark-rosa")).toBe("amigo2");
  });

  it("corrige capas cujo arquivo traz margem interna opaca", () => {
    expect(getThemeCoverScale("arca-de-noe")).toBe(1.65);
    expect(getThemeCoverScale("safari")).toBe(1);
  });
});
