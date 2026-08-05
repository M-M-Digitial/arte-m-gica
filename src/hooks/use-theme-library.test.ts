import { describe, expect, it } from "vitest";
import { buildThemeLibraryCards } from "./use-theme-library";

describe("biblioteca visual de temas", () => {
  it("usa papel e personagem reais do mesmo acervo do editor", () => {
    const cards = buildThemeLibraryCards([
      { theme_slug: "festa", kind: "clipart", role: "principal", url: "hero.png", meta: { w: 600, h: 900 } },
      { theme_slug: "festa", kind: "clipart", role: "amigo", url: "friend.png", meta: { w: 500, h: 800 } },
      { theme_slug: "festa", kind: "papel", role: "top", url: "top.png" },
      { theme_slug: "festa", kind: "papel", role: "body", url: "body.png" },
      { theme_slug: "festa", kind: "fonte", role: "fonte", url: "font.ttf", meta: { cor: "#123456", cor2: "#F2A900" } },
    ], [{ slug: "festa", name: "Festa" }]);

    expect(cards).toHaveLength(1);
    expect(cards[0]).toMatchObject({ cover: "hero.png", paper: "body.png", heroCount: 2 });
    expect(cards[0].palette.primary).toBe("#123456");
  });

  it("nao publica tema incompleto com capa improvisada", () => {
    const cards = buildThemeLibraryCards([
      { theme_slug: "incompleto", kind: "clipart", role: "principal", url: "hero.png" },
    ], [{ slug: "incompleto", name: "Incompleto" }]);

    expect(cards).toEqual([]);
  });
});
