import { describe, expect, it } from "vitest";
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
});
