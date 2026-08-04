import { describe, expect, it } from "vitest";
import { getThemeReadiness, isThemeHeroAsset } from "./theme-curation";

const completeAssets = [
  { kind: "papel", role: "top", url: "top.png" },
  { kind: "papel", role: "body", url: "body.png" },
  { kind: "fonte", role: "fonte", url: "font.ttf" },
  { kind: "clipart", role: "principal", url: "hero.png", meta: { usage: "hero" } },
  { kind: "clipart", role: "amigo", url: "friend.png", meta: { usage: "hero" } },
];

describe("theme curation", () => {
  it("aprova somente temas completos para o compositor", () => {
    expect(getThemeReadiness(completeAssets)).toMatchObject({
      ready: true,
      counts: { heroes: 2, papers: 2, fonts: 1 },
    });
  });

  it("reprova personagem decorativo e tema com arte insuficiente", () => {
    const ornament = {
      kind: "clipart",
      role: "ornamento-arco-iris",
      url: "rainbow.png",
      meta: { usage: "ornament" },
    };
    expect(isThemeHeroAsset(ornament)).toBe(false);
    expect(getThemeReadiness([...completeAssets.slice(0, 4), ornament])).toMatchObject({
      ready: false,
      counts: { heroes: 1 },
    });
  });

  it("ignora arquivos desabilitados e URLs duplicadas", () => {
    const duplicated = [
      ...completeAssets,
      { kind: "clipart", role: "amigo2", url: "friend.png", meta: { usage: "hero" } },
      { kind: "clipart", role: "amigo3", url: "disabled.png", meta: { usage: "hero", enabled: false } },
    ];
    expect(getThemeReadiness(duplicated).counts.heroes).toBe(2);
  });
});
