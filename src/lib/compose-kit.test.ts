import { describe, expect, it } from "vitest";
import { classifyClipartUsage, extractMoldGeometry, findVisibleBounds, montarSvgKit } from "./compose-kit";

describe("composição SVG do kit", () => {
  it("preserva todas as linhas do molde e uma máscara por alpha", () => {
    const moldSvg = `<svg viewBox="0 0 100 80"><defs><clipPath id="duplicate"><path d="M0 0 H100"/></clipPath></defs><path d="M0 0 H100"/><path d="M0 80 H100" stroke-dasharray="4 3"/></svg>`;
    const svg = montarSvgKit({
      moldSvg,
      facesJson: JSON.stringify({ faces: [{ x: 0, y: 0, w: 100, h: 80, cx: 50, cy: 40, area: 8000 }] }),
      maskUri: "data:image/png;base64,AAAA",
      papelTopUri: null,
      papelBodyUri: null,
      principal: null,
      amigo: null,
      amigo2: null,
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#7A2FB0",
      corIdade: "#1BA67C",
      corFundo: "#F4F0FF",
      corAcento: "#E15587",
      nome: "Sofia",
    });

    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('mask-type="alpha"');
    expect(svg).toContain('clipPath id="paperShape"');
    expect(svg).toContain('clip-path="url(#paperShape)"');
    expect(svg).toContain('metadata id="alice-quality-standard"');
    expect(svg).toContain('stop-color="#F4F0FF"');
    expect(svg).toContain('data-name-plate="true"');
    expect(svg).toContain('<metadata id="alice-composition-profile">cenario</metadata>');
    expect(svg).toContain("M0 0 H100");
    expect(svg).toContain("M0 80 H100");
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(extractMoldGeometry(moldSvg).match(/d="M0 0 H100"/g)).toHaveLength(1);
    expect(svg.match(/id="molde-tecnico"/g)).toHaveLength(1);
    expect(svg).toContain('<metadata id="technical-mold-instance-count">1</metadata>');
  });

  it("aplica a paleta como base visivel sem perder a textura do tema", () => {
    const svg = montarSvgKit({
      moldSvg: `<svg viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100"/></svg>`,
      facesJson: JSON.stringify({ faces: [{ x: 0, y: 20, w: 100, h: 70, cx: 50, cy: 55, area: 7000 }] }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: "data:image/png;base64,TOP",
      papelBodyUri: "data:image/png;base64,BODY",
      papelBodyInfo: { busy: false, corMedia: "#F2C45A" },
      personagens: [],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#245F4F",
      corIdade: "#E4A82B",
      corFundo: "#E9F5EA",
      corAcento: "#C9533F",
      nome: "Lia",
    });

    expect(svg).toContain('height="20" fill="#245F4F"');
    expect(svg).toContain('fill="url(#papelTop)" opacity="0.30"');
    expect(svg).toContain('height="10" fill="#245F4F"');
    expect(svg).toContain('fill="url(#papelTop)" opacity="0.28"');
    expect(svg).toContain('height="70" fill="#E9F5EA"');
    expect(svg).toContain('fill="url(#papelBody)" opacity="0.4"');
  });

  it("ignora pixels transparentes isolados ao calcular o recorte", () => {
    const width = 10;
    const height = 10;
    const rgba = new Uint8ClampedArray(width * height * 4);
    rgba[3] = 255;
    for (let y = 2; y <= 7; y++) {
      for (let x = 3; x <= 6; x++) rgba[(y * width + x) * 4 + 3] = 255;
    }

    expect(findVisibleBounds(rgba, width, height)).toEqual({ minX: 3, minY: 2, maxX: 6, maxY: 7 });
  });

  it("separa personagens de ornamentos, bordas e paineis", () => {
    expect(classifyClipartUsage({ uri: "hero", w: 300, h: 500 })).toBe("hero");
    expect(classifyClipartUsage({ uri: "wide-hero", w: 1200, h: 300, role: "principal" })).toBe("hero");
    expect(classifyClipartUsage({ uri: "border", w: 900, h: 200 })).toBe("border");
    expect(classifyClipartUsage({ uri: "panel", w: 640, h: 400, visibleCoverage: 0.95 })).toBe("panel");
    expect(classifyClipartUsage({ uri: "rose", w: 400, h: 400, usage: "ornament" })).toBe("ornament");
  });

  it("usa composicao modular quando o papel do corpo e uma estampa densa", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 80,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 140,
      area: 12000,
    }));
    const svg = montarSvgKit({
      moldSvg: `<svg viewBox="0 0 400 240"><rect x="0" y="0" width="400" height="240"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,AAAA",
      papelTopUri: "data:image/png;base64,TOP",
      papelBodyUri: "data:image/png;base64,BODY",
      papelBodyInfo: { busy: true, corMedia: "#E9D8D3" },
      principal: { uri: "data:image/png;base64,HERO", w: 100, h: 160 },
      amigo: null,
      amigo2: null,
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#1F1F1F",
      corIdade: "#F47A2A",
      corFundo: "#FFF1E8",
      corAcento: "#F47A2A",
      nome: "Sofia",
      idade: "5",
    });

    expect(svg).toContain('<metadata id="alice-composition-profile">modular</metadata>');
    expect(svg).toContain('fill="url(#papelTop)"');
    expect(svg).toContain('fill="url(#papelBody)"');
    expect(svg).toContain('fill="url(#papelBody)" opacity="0.22"');
    expect(svg).toContain("Sofia");
    expect(svg.match(/<image href="data:image\/png;base64,HERO"/g)).toHaveLength(1);
    expect(svg.match(/data-theme-monogram="true"/g)).toHaveLength(3);
    expect(svg).toContain('data-name-plate="true"');
  });

  it("reserva duas faces inferiores e delicadas para o nome na Caixa Milk", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 60,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 120,
      area: 12000,
    }));
    const svg = montarSvgKit({
      moldName: "Caixa Milk",
      moldSvg: `<svg viewBox="0 0 400 220"><rect x="0" y="0" width="400" height="220"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,AAAA",
      papelTopUri: null,
      papelBodyUri: null,
      principal: { uri: "data:image/png;base64,HERO", w: 80, h: 120 },
      amigo: null,
      amigo2: null,
      placaUri: null,
      placaMeta: null,
      fonteFamily: "serif",
      fonteUri: null,
      corNome: "#314A7D",
      corIdade: "#D8B85B",
      nome: "Flora",
      idade: "3",
    });

    expect(svg.match(/>Flora<\/text>/g)).toHaveLength(2);
    expect(svg.match(/data-name-plate="true"/g)).toHaveLength(2);
    expect(Array.from(svg.matchAll(/data-name-plate="true"[^>]*data-face-x="([^"]+)"/g), (match) => match[1])).toEqual(["0", "300"]);
    expect(svg).toContain('<metadata id="front-face-index">1</metadata>');
    expect(svg).toContain('<metadata id="side-face-indices">0,3</metadata>');
    expect(svg.match(/data-face-role="front"/g)).toHaveLength(1);
    expect(svg.match(/data-face-role="side"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(svg).toContain('data-visual-priority="primary" data-crease-safe="true"');
    expect(svg.match(/<image href="data:image\/png;base64,HERO"/g)).toHaveLength(1);
    expect(svg.match(/data-theme-monogram="true"/g)).toHaveLength(3);
    expect(svg).toContain('width="64"');
  });

  it("aplica fonte e tamanho escolhidos sem reduzir a altura de nomes longos", () => {
    const svg = montarSvgKit({
      moldSvg: `<svg viewBox="0 0 240 180"><rect x="0" y="0" width="240" height="180"/></svg>`,
      facesJson: JSON.stringify({ faces: [{ x: 20, y: 30, w: 200, h: 130, cx: 120, cy: 95, area: 26000 }] }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: null,
      papelBodyUri: null,
      personagens: [],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "Georgia, serif",
      fonteUri: null,
      fonteScale: 1.5,
      corNome: "#245F4F",
      corIdade: "#E4A82B",
      nome: "Maria Eduarda",
      idade: "6",
    });

    expect(svg).toContain('font-family="Georgia, serif"');
    expect(svg).toContain('lengthAdjust="spacingAndGlyphs"');
    expect(svg).toContain('>Maria Eduarda</text>');
    const tamanhoNome = svg.match(/font-size="([\d.]+)"[^>]*lengthAdjust="spacingAndGlyphs"[^>]*>Maria Eduarda/);
    expect(Number(tamanhoNome?.[1])).toBeGreaterThan(12);
  });

  it("usa apenas poses distintas nas faces disponiveis", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 60,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 120,
      area: 12000,
    }));
    const personagens = ["POSE_A", "POSE_B", "POSE_C", "POSE_D"].map((uri) => ({
      uri: `data:image/png;base64,${uri}`,
      w: 80,
      h: 120,
    }));
    const svg = montarSvgKit({
      moldName: "Caixa Milk",
      moldSvg: `<svg viewBox="0 0 400 220"><rect x="0" y="0" width="400" height="220"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,AAAA",
      papelTopUri: null,
      papelBodyUri: null,
      personagens,
      placaUri: null,
      placaMeta: null,
      fonteFamily: "serif",
      fonteUri: null,
      corNome: "#314A7D",
      corIdade: "#D8B85B",
      nome: "Flora",
      idade: "3",
    });

    const posesUsadas = Array.from(svg.matchAll(/<image href="data:image\/png;base64,(POSE_[A-D])"/g))
      .map((match) => match[1]);
    expect(posesUsadas).toHaveLength(4);
    expect(new Set(posesUsadas).size).toBe(4);
    expect(posesUsadas).toContain("POSE_A");
    expect(posesUsadas).toContain("POSE_D");
    expect(svg).not.toContain('scale(-1 1)');
  });

  it("mantem o personagem dentro da area segura de impressao", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 40,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 100,
      area: 12000,
    }));
    const svg = montarSvgKit({
      moldName: "Caixa Milk",
      moldSvg: `<svg viewBox="0 0 400 200"><rect x="0" y="0" width="400" height="200"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: null,
      papelBodyUri: null,
      personagens: [{ uri: "data:image/png;base64,HERO", w: 100, h: 100, role: "principal" }],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#2563B8",
      corIdade: "#F2C94C",
      nome: "Lia",
    });

    const hero = svg.match(/data-print-safe="true"[^>]*x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
    expect(hero).not.toBeNull();
    const [, x, y, width, height] = hero!.map(Number);
    expect(x).toBeGreaterThanOrEqual(5.5);
    expect(y).toBeGreaterThanOrEqual(49);
    expect(width).toBeLessThanOrEqual(89);
    expect(y + height).toBeLessThanOrEqual(152.2);
  });

  it("mantem nome e personagens apenas nas faces centrais da Caixa Canudo", () => {
    const faces = [
      { x: 778, y: 171, w: 480, h: 599, area: 255021, cx: 1017.5, cy: 470 },
      { x: 1798, y: 171, w: 480, h: 599, area: 254821, cx: 2037.5, cy: 470 },
      { x: 1277, y: 777, w: 504, h: 505, area: 237746, cx: 1528.5, cy: 1029 },
      { x: 771, y: 778, w: 498, h: 504, area: 235627, cx: 1019.5, cy: 1029.5 },
      { x: 261, y: 778, w: 495, h: 503, area: 235227, cx: 508, cy: 1029 },
      { x: 1788, y: 778, w: 490, h: 504, area: 234421, cx: 2032.5, cy: 1029.5 },
      { x: 1288, y: 1289, w: 480, h: 322, area: 122045, cx: 1527.5, cy: 1449.5 },
      { x: 270, y: 467, w: 476, h: 303, area: 117886, cx: 507.5, cy: 618 },
      { x: 1290, y: 467, w: 476, h: 303, area: 117792, cx: 1527.5, cy: 618 },
    ];
    const svg = montarSvgKit({
      moldName: "Caixa Canudo",
      moldSvg: `<svg viewBox="0 0 2526 1786"><rect x="0" y="0" width="2526" height="1786"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: null,
      papelBodyUri: null,
      personagens: [
        { uri: "data:image/png;base64,HERO_A", w: 800, h: 1200, role: "principal" },
        { uri: "data:image/png;base64,HERO_B", w: 900, h: 1100, role: "amigo" },
      ],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#163B73",
      corIdade: "#F28C28",
      nome: "Pablo Ryan",
      idade: "2",
    });

    expect(svg).toContain('<metadata id="printable-face-count">4</metadata>');
    expect(svg).not.toMatch(/data-theme-(?:hero|monogram|panel|ornament)="true"[^>]*data-face-y="(?:171|467|1289)"/);
    expect(svg).toMatch(/data-name-plate="true"[^>]*data-face-y="77[78]"/);
    expect(svg.lastIndexOf('data-name-plate="true"')).toBeGreaterThan(svg.lastIndexOf('data-theme-hero="true"'));
  });

  it("aplica uma composicao realmente saturada na paleta vibrante", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 40,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 100,
      area: 12000,
    }));
    const svg = montarSvgKit({
      moldName: "Caixa Milk",
      moldSvg: `<svg viewBox="0 0 400 200"><rect x="0" y="0" width="400" height="200"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: "data:image/png;base64,TOP",
      papelBodyUri: "data:image/png;base64,BODY",
      personagens: [{ uri: "data:image/png;base64,HERO", w: 100, h: 100, role: "principal" }],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "sans-serif",
      fonteUri: null,
      corNome: "#E6005C",
      corIdade: "#FFD000",
      corFundo: "#29C7D8",
      corAcento: "#35B84A",
      paletteAppearance: "vibrant",
      nome: "Lia",
      idade: "4",
    });

    expect(svg).toContain('<metadata id="color-appearance">vibrant</metadata>');
    expect(svg).toContain('<metadata id="market-research-version">market-multi-2026-08-05-r2</metadata>');
    expect(svg).toContain('<metadata id="market-reference-sample-size">236</metadata>');
    expect(svg).toContain('<metadata id="google-image-validation-size">350</metadata>');
    expect(svg).toContain('<metadata id="shopee-indexed-validation-size">150</metadata>');
    expect(svg).toContain('<metadata id="shopee-direct-access">blocked-login-required</metadata>');
    expect(svg).toContain('data-vibrant-color-wash="true"');
    expect(svg).toContain('fill="#29C7D8"');
    expect(svg).toContain('fill="url(#papelBody)" opacity="0.14"');
    expect(svg).toContain('fill="#35B84A" fill-opacity="0.92"');
  });

  it("aplica acabamento refinado sem transformar a opcao elegante em pastel vazio", () => {
    const faces = Array.from({ length: 4 }, (_, index) => ({
      x: index * 100,
      y: 40,
      w: 100,
      h: 120,
      cx: index * 100 + 50,
      cy: 100,
      area: 12000,
    }));
    const svg = montarSvgKit({
      moldName: "Caixa Milk",
      moldSvg: `<svg viewBox="0 0 400 200"><rect x="0" y="0" width="400" height="200"/></svg>`,
      facesJson: JSON.stringify({ faces }),
      maskUri: "data:image/png;base64,MASK",
      papelTopUri: "data:image/png;base64,TOP",
      papelBodyUri: "data:image/png;base64,BODY",
      personagens: [{ uri: "data:image/png;base64,HERO", w: 100, h: 100, role: "principal" }],
      placaUri: null,
      placaMeta: null,
      fonteFamily: "serif",
      fonteUri: null,
      corNome: "#7A2D52",
      corIdade: "#C8A44D",
      corFundo: "#F8F3F6",
      corAcento: "#2F6B5B",
      paletteAppearance: "elegant",
      nome: "Lia",
      idade: "4",
    });

    expect(svg).toContain('<metadata id="color-appearance">elegant</metadata>');
    expect(svg).toContain('data-elegant-finish="true"');
    expect(svg).not.toContain('data-vibrant-color-wash="true"');
    expect(svg).toContain('fill="url(#papelBody)" opacity="0.28"');
  });
});
