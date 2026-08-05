import { describe, expect, it } from "vitest";
import { getDefaultThemePalette } from "./theme-palettes";

describe("default theme palettes", () => {
  it("usa cores infantis coordenadas na Bela e a Fera", () => {
    expect(getDefaultThemePalette("a-bela-e-a-fera")).toEqual({
      primary: "#2563B8",
      secondary: "#F2C94C",
      background: "#FFF0B8",
      accent: "#F04E7A",
    });
  });

  it("não força paleta em temas sem curadoria específica", () => {
    expect(getDefaultThemePalette("tema-sem-override")).toBeUndefined();
  });
});
