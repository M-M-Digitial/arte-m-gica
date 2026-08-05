import { describe, expect, it } from "vitest";
import { getThemeSceneFamily, montarSvgKit, type KitDados } from "@/lib/compose-kit";

const faces = [0, 1, 2, 3].map((index) => ({
  x: 100 + index * 200,
  y: 300,
  w: 200,
  h: 320,
  cx: 200 + index * 200,
  cy: 460,
  area: 64_000,
}));

const base: KitDados = {
  moldName: "Caixa Bala",
  themeSlug: "a-bela-e-a-fera",
  moldSvg: '<svg viewBox="0 0 1000 1000"><path d="M 50 100 H 950 V 900 H 50 Z"/></svg>',
  facesJson: JSON.stringify({ faces }),
  maskUri: "data:image/png;base64,mask",
  papelTopUri: "data:image/png;base64,top",
  papelBodyUri: "data:image/png;base64,body",
  papelBodyInfo: { busy: false, corMedia: "#FBE7EF" },
  personagens: [
    { uri: "data:image/png;base64,hero1", w: 500, h: 800, role: "principal" },
    { uri: "data:image/png;base64,hero2", w: 540, h: 760, role: "secundario" },
    { uri: "data:image/png;base64,hero3", w: 520, h: 740, role: "secundario" },
  ],
  placaUri: null,
  placaMeta: null,
  fonteFamily: "Baloo",
  fonteUri: null,
  corNome: "#B91C5C",
  corIdade: "#F4B942",
  corFundo: "#FBE7EF",
  corAcento: "#15A6A6",
  nome: "Celine",
  idade: "3",
};

describe("profundidade comercial do compositor", () => {
  it("ancora personagens e personalizacao em camadas sem tocar o molde tecnico", () => {
    const svg = montarSvgKit(base);
    expect(svg).toContain('data-commercial-depth="ground-plane"');
    expect(svg).toContain('data-commercial-depth="contact-shadow"');
    expect(svg).toContain('data-commercial-layering="hero"');
    expect(svg).toContain('data-commercial-depth="name-shadow"');
    expect(svg).toContain('data-scene-template="fairytale-ballroom"');
    expect(svg).toContain('data-scene-continuity="true"');
    expect(svg).toContain('data-premium-bow="true"');
    expect(svg).toContain('data-protected-zone="decorative-bow"');
    expect(svg).toContain('<linearGradient id="bowSilk"');
    expect(svg).toContain('<filter id="bowShadow"');
    expect(svg.match(/data-commercial-layering="hero"/g)?.length).toBe(4);
    expect(svg).toContain('<filter id="softShadow"');
    expect(svg.indexOf('id="molde-tecnico"')).toBeGreaterThan(svg.indexOf('data-protected-zone="name"'));
  });

  it("cria um plano intermediario para papeis densos", () => {
    const svg = montarSvgKit({
      ...base,
      papelBodyInfo: { busy: true, corMedia: "#CE3A75" },
    });
    expect(svg).toContain('alice-composition-profile">modular');
    expect(svg).toContain('data-commercial-depth="midground"');
  });

  it("seleciona cenarios narrativos em vez de confetes genericos", () => {
    expect(getThemeSceneFamily("a-bela-e-a-fera")).toBe("fairytale");
    expect(getThemeSceneFamily("a-era-do-gelo")).toBe("ice");
    expect(getThemeSceneFamily("safari")).toBe("safari");
    expect(getThemeSceneFamily("a-pequena-sereia")).toBe("ocean");
    const svg = montarSvgKit({
      ...base,
      personagens: [
        ...base.personagens!,
        { uri: "data:image/png;base64,hero4", w: 500, h: 760, role: "secundario" },
        { uri: "data:image/png;base64,scene", w: 1400, h: 1000, role: "panel", usage: "panel" },
        { uri: "data:image/png;base64,roses", w: 850, h: 600, role: "ornament", usage: "ornament" },
      ],
    });
    expect(svg.match(/data-commercial-layering="hero"/g)?.length).toBe(4);
    expect(svg).toContain('data-theme-scene="panoramic"');
    expect(svg).toContain('data-scene-continuity="licensed-panel"');
    expect(svg).toContain('data-commercial-depth="foreground-ornament"');
    expect(svg).not.toContain("data-festive-accents");
  });
});
