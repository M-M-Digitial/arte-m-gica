import { describe, expect, it, vi } from "vitest";
import { extrairGeometriaTecnica, montarSvgHibrido } from "./svg-arte";

const moldSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80">
  <defs><path d="M99 99"/></defs>
  <path d="M0 0 H100" fill="none" stroke="#111"/>
  <path d="M0 80 H100" fill="none" stroke="#111" stroke-dasharray="4 3"/>
  <script>alert(1)</script>
</svg>`;

describe("SVG de entrega", () => {
  it("mantém todas as geometrias técnicas e ignora defs", () => {
    const geometry = extrairGeometriaTecnica(moldSvg);

    expect(geometry).toContain("M0 0 H100");
    expect(geometry).toContain("M0 80 H100");
    expect(geometry).not.toContain("M99 99");
    expect(geometry).not.toContain("script");
  });

  it("gera SVG autocontido com imagem e camada vetorial compatíveis", () => {
    const svg = montarSvgHibrido({
      imagem: "data:image/png;base64,AAAA",
      moldeSvg: moldSvg,
      nomeArquivo: "arte Sofia",
    });

    expect(svg).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(svg).toContain("xmlns:xlink=");
    expect(svg).toContain("xlink:href=\"data:image/png;base64,AAAA\"");
    expect(svg).toContain('id="molde-tecnico"');
    expect(svg).toContain('stroke-dasharray="4 3"');
    expect(svg).not.toContain("M99 99");
  });

  it("mantem nome editavel, escapa XML e deixa as linhas tecnicas acima da personalizacao", () => {
    const canvas = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    try {
      const svg = montarSvgHibrido({
        imagem: "data:image/png;base64,AAAA", nomeArquivo: "teste",
        moldeSvg: '<svg viewBox="0 0 2526 1786"><path d="M1 1L2 2"/></svg>',
        personalization: {
          layout: { width: 2526, height: 1786, labels: [{ x: 0.1, y: 0.4, w: 0.4, h: 0.25, rotation: 0, cx: 0.3, cy: 0.5 }] },
          value: { name: "João & Sofia", age: "3", phrase: "", font: "divertida", scale: 1, accent: "#12AABB", finish: "camadas" },
        },
      });
      const document = new DOMParser().parseFromString(svg, "image/svg+xml");
      expect(document.querySelector("parsererror")).toBeNull();
      expect(Array.from(document.querySelectorAll("#personalizacao-editavel tspan"), (node) => node.textContent).join(" ")).toBe("João & Sofia");
      expect(document.querySelector("#personalizacao-editavel")?.textContent).toContain("3 anos");
      expect(svg.indexOf('id="personalizacao-editavel"')).toBeLessThan(svg.indexOf('id="molde-tecnico"'));
      expect(svg).not.toContain("textLength");
      expect(svg).not.toContain("foreignObject");
    } finally { canvas.mockRestore(); }
  });
});
