import { describe, expect, it } from "vitest";
import { montarSvgKit, type KitDados } from "./compose-kit";
import { validateComposedKitSvg } from "./kit-quality";

const faces = Array.from({ length: 4 }, (_, index) => ({
  x: index * 100,
  y: 40,
  w: 100,
  h: 120,
  cx: index * 100 + 50,
  cy: 100,
  area: 12_000,
  safeX: index * 100,
  safeY: 40,
  safeW: 100,
  safeH: 120,
}));

const base: KitDados = {
  moldName: "Caixa Bala",
  themeSlug: "a-bela-e-a-fera",
  moldSvg: '<svg viewBox="0 0 400 200"><rect x="0" y="0" width="400" height="200"/></svg>',
  facesJson: JSON.stringify({ faces }),
  maskUri: "data:image/png;base64,MASK",
  papelTopUri: "data:image/png;base64,TOP",
  papelBodyUri: "data:image/png;base64,BODY",
  papelBodyInfo: { busy: false, corMedia: "#FBE7EF" },
  personagens: [
    { uri: "data:image/png;base64,HERO_1", w: 500, h: 800, role: "principal", visibleCoverage: 0.72 },
    { uri: "data:image/png;base64,HERO_2", w: 540, h: 760, role: "amigo", visibleCoverage: 0.68 },
    { uri: "data:image/png;base64,HERO_3", w: 520, h: 740, role: "amigo2", visibleCoverage: 0.70 },
  ],
  placaUri: null,
  placaMeta: null,
  fonteFamily: "sans-serif",
  fonteUri: null,
  corNome: "#7A2FB0",
  corIdade: "#E7B93F",
  corFundo: "#ECF3FF",
  corAcento: "#D77DA5",
  paletteAppearance: "balanced",
  nome: "Celine",
  idade: "2",
};

const validate = (svg: string) => validateComposedKitSvg(svg, {
  expectedName: "Celine",
  expectedAge: "2",
  moldName: "Caixa Bala",
});

describe("curadoria deterministica do SVG composto", () => {
  it("aprova somente a composicao completa, segura e sem poses repetidas", () => {
    const report = validate(montarSvgKit(base));

    expect(report.approved, report.issues.map((issue) => issue.code).join(", ")).toBe(true);
    expect(report.score).toBeGreaterThanOrEqual(86);
    expect(report.metrics).toMatchObject({
      printableFaces: 4,
      activeFaces: 4,
      heroInstances: 3,
      uniqueHeroes: 3,
      namePlates: 1,
      thematicDetailFaces: 4,
      visualLayers: 3,
    });
    expect(report.metrics.minimumFaceActiveEvidenceRatio).toBeGreaterThanOrEqual(0.30);
    expect(report.metrics.maximumHeroVisibleAreaRatio).toBeGreaterThanOrEqual(0.14);
  });

  it("bloqueia qualquer imagem externa no SVG importavel", () => {
    const svg = montarSvgKit(base).replace(
      'href="data:image/png;base64,MASK"',
      'href="https://example.com/mask.png"',
    );
    const report = validate(svg);

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "embedded_assets",
      critical: true,
    }));
  });

  it("bloqueia nome adulterado depois da composicao", () => {
    const svg = montarSvgKit(base).replace(">Celine</text>", ">Outra</text>");
    const report = validate(svg);

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "personalization",
      critical: true,
    }));
  });

  it("bloqueia repeticao do mesmo recorte em faces diferentes", () => {
    const svg = montarSvgKit(base)
      .split("data:image/png;base64,HERO_2")
      .join("data:image/png;base64,HERO_1");
    const report = validate(svg);

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "hero_diversity",
      critical: true,
    }));
  });

  it("bloqueia personagem declarado grande mas com poucos pixels visiveis", () => {
    const svg = montarSvgKit(base).replace(
      /data-visible-coverage="[0-9.]+"/g,
      'data-visible-coverage="0.01"',
    );
    const report = validate(svg);

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "visual_hierarchy",
      critical: true,
    }));
  });

  it("bloqueia face que tenta se certificar sem detalhes tematicos renderizaveis", () => {
    const svg = montarSvgKit(base).replace(
      'data-theme-detail="true"',
      'data-theme-detail="tampered"',
    );
    const report = validate(svg);

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "visible_face_coverage",
      critical: true,
    }));
  });

  it("bloqueia piramide sem zonas orientadas para a montagem", () => {
    const svg = montarSvgKit({ ...base, moldName: "Caixa Piramide" });
    const report = validateComposedKitSvg(svg, {
      expectedName: "Celine",
      expectedAge: "2",
      moldName: "Caixa Piramide",
    });

    expect(report.approved).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: "oriented_face_geometry",
      critical: true,
    }));
  });

  it("aceita uma face da piramide alinhada em zero graus quando as quatro orientacoes foram medidas", () => {
    const orientedFaces = faces.map((face, index) => ({
      ...face,
      safeRotation: index * 45,
    }));
    const svg = montarSvgKit({
      ...base,
      moldName: "Caixa Piramide",
      facesJson: JSON.stringify({ faces: orientedFaces }),
    });
    const report = validateComposedKitSvg(svg, {
      expectedName: "Celine",
      expectedAge: "2",
      moldName: "Caixa Piramide",
    });

    expect(report.issues).not.toContainEqual(expect.objectContaining({
      code: "oriented_face_geometry",
    }));
  });
});
