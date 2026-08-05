import { describe, expect, it } from "vitest";
import { montarSvgKit, type KitDados } from "@/lib/compose-kit";

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
    expect(svg).toContain('data-premium-bow="true"');
    expect(svg).toContain('data-protected-zone="decorative-bow"');
    expect(svg).toContain('<linearGradient id="bowSilk"');
    expect(svg).toContain('<filter id="bowShadow"');
    expect(svg.match(/data-commercial-layering="hero"/g)?.length).toBe(3);
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
});
