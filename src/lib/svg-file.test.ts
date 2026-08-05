import { describe, expect, it } from "vitest";
import { normalizarDocumentoSvg } from "./svg-file";

describe("arquivo SVG importável", () => {
  it("entrega XML/SVG puro com namespaces e sem HTML", () => {
    const svg = normalizarDocumentoSvg('<svg viewBox="0 0 10 10"><image xlink:href="data:image/png;base64,AAAA"/></svg>');

    expect(svg).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>\n<svg/);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
    expect(svg).toContain('version="1.1"');
    expect(svg).not.toMatch(/<html|<body|doctype html/i);
  });

  it("rejeita uma página HTML contendo uma prévia SVG", () => {
    expect(() => normalizarDocumentoSvg("<html><body><svg></svg></body></html>"))
      .toThrow("HTML, não SVG");
  });
});
