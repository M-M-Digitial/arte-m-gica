import { describe, expect, it } from "vitest";
import { proporcaoDoSvg } from "./mold-export";

describe("exportação opcional do molde", () => {
  it("preserva a proporção do SVG ao preparar PNG e PDF", () => {
    expect(proporcaoDoSvg('<svg viewBox="0 0 1200 800"></svg>')).toBe(1.5);
    expect(proporcaoDoSvg('<svg viewBox="0 0 600 1200"></svg>')).toBe(0.5);
  });
});
