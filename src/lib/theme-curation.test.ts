import { describe, expect, it } from "vitest";
import { getThemeReadiness, isThemeHeroAsset } from "./theme-curation";

const completeAssets = [
  { kind: "papel", role: "top", url: "top.png" },
  { kind: "papel", role: "body", url: "body.png" },
  { kind: "fonte", role: "fonte", url: "font.ttf" },
  { kind: "clipart", role: "principal", url: "hero.png", meta: { usage: "hero" } },
  { kind: "clipart", role: "amigo", url: "friend.png", meta: { usage: "hero" } },
  { kind: "clipart", role: "amigo2", url: "friend-2.png", meta: { usage: "hero" } },
  { kind: "clipart", role: "amigo3", url: "friend-3.png", meta: { usage: "hero" } },
];

describe("theme curation", () => {
  it("aprova somente temas completos para o compositor", () => {
    expect(getThemeReadiness(completeAssets)).toMatchObject({
      ready: true,
      commercialReady: true,
      counts: { heroes: 4, papers: 2, fonts: 1 },
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
    expect(getThemeReadiness(duplicated).counts.heroes).toBe(4);
  });

  it("nao usa painel panoramico nem placa vazia para completar as quatro faces", () => {
    const misleadingDecor = [
      { kind: "clipart", role: "principal", url: "scene.png", meta: { usage: "panel", w: 2000, h: 1400 } },
      { kind: "clipart", role: "amigo4", url: "blank-plaque.png", meta: { usage: "ornament" } },
    ];
    const result = getThemeReadiness([...completeAssets.slice(0, 3), ...misleadingDecor]);

    expect(result.ready).toBe(false);
    expect(result.commercialReady).toBe(false);
    expect(result.counts.heroes).toBe(0);
    expect(result.reasons).toContain("personagem principal ausente");
    expect(result.reasons).toContain("menos de dois personagens distintos");
  });

  it("mantem o tema funcional com dois herois, mas sinaliza cobertura comercial incompleta", () => {
    const result = getThemeReadiness(completeAssets.slice(0, 5));

    expect(result.ready).toBe(true);
    expect(result.commercialReady).toBe(false);
    expect(result.warnings).toContain("menos de quatro personagens distintos para as quatro faces");
  });
});
