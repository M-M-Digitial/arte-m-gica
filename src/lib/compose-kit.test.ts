import { describe, expect, it } from "vitest";
import { montarSvgKit } from "./compose-kit";

describe("composição SVG do kit", () => {
  it("preserva todas as linhas do molde e uma máscara por alpha", () => {
    const svg = montarSvgKit({
      moldSvg: `<svg viewBox="0 0 100 80"><path d="M0 0 H100"/><path d="M0 80 H100" stroke-dasharray="4 3"/></svg>`,
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
      nome: "Sofia",
    });

    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('mask-type="alpha"');
    expect(svg).toContain('clipPath id="paperShape"');
    expect(svg).toContain('clip-path="url(#paperShape)"');
    expect(svg).toContain("M0 0 H100");
    expect(svg).toContain("M0 80 H100");
    expect(svg).toContain('stroke-dasharray="4 3"');
  });
});
