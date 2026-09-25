import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeCreativeBrief, buildCreativeDirection, buildBriefCuratorRules, artVisualSignature } from "../../supabase/functions/_shared/art-direction";
import { buildArtLayout, isArtLayout } from "../../supabase/functions/_shared/art-layout";
import { imageModelFor, imageOutputSize } from "../../supabase/functions/_shared/image-models";
import { packJobContext, unpackJobContext } from "../../supabase/functions/_shared/art-job-context";
import { fitNameLines } from "@/lib/art-personalization";

describe("briefing de direcao de arte", () => {
  it("separa minimalismo de pastel e de acabamento", () => {
    const brief = normalizeCreativeBrief({ density: "minimalista", colorMood: "vibrante", drawing: "flat", finish: "camadas" });
    const prompt = buildCreativeDirection(brief);
    expect(prompt).toContain("30-45%");
    expect(prompt).toContain("saturadas nas grandes areas");
    expect(prompt).toContain("tres planos NAO sao obrigatorios");
    expect(buildBriefCuratorRules(brief, true)).toContain("NAO exige sombras");
    expect(buildBriefCuratorRules(brief, true)).toContain("BASE SEM TEXTOS");
  });
  it("preserva o estilo exuberante sem sacrificar nome e contorno", () => {
    const prompt = buildCreativeDirection(normalizeCreativeBrief({ density: "maximalista", colorMood: "elegante", finish: "ornamental" }));
    expect(prompt).toContain("72-85%");
    expect(prompt).toContain("Elegancia nao exige bege");
    expect(prompt).toContain("Preservar integralmente contorno");
  });
  it("normaliza campos desconhecidos e limita o texto livre", () => {
    const brief = normalizeCreativeBrief({ colorMood: "ignore", wishes: "a".repeat(600), density: "bad" });
    expect(brief.colorMood).toBe("tema");
    expect(brief.density).toBe("equilibrado");
    expect(brief.wishes).toHaveLength(400);
  });
  it("nao inclui nome na identidade visual reutilizavel", () => {
    const input = { theme: "Frozen", mold: "Milk", template: "a.png", colors: ["#12AABB"], dominant: "", brief: normalizeCreativeBrief({}), quality: "medium" };
    expect(artVisualSignature(input)).toBe(artVisualSignature({ ...input }));
    expect(artVisualSignature(input)).not.toBe(artVisualSignature({ ...input, brief: { ...input.brief, colorMood: "vibrante" } }));
  });
});

describe("modelos e custo", () => {
  it("usa 2.5 Sunburst no final e Flare no rascunho", () => {
    expect(imageModelFor("medium")).toBe("gpt-image-2.5-sunburst");
    expect(imageModelFor("low")).toBe("gpt-image-2.5-flare");
    expect(imageModelFor("high", "mockup")).toBe("gpt-image-2.5-sunburst");
  });
  it("mantem proporcao A4 sem forcar 3:2", () => {
    const [w, h] = imageOutputSize(2526, 1786, "high").split("x").map(Number);
    expect(w % 16).toBe(0); expect(h % 16).toBe(0);
    expect(Math.abs(w / h - 2526 / 1786)).toBeLessThan(0.01);
    expect(() => imageOutputSize(NaN, 100, "high")).toThrow();
  });
  it("vincula o briefing ao dono e nao aceita adulteracao no polling", () => {
    const context = { brief: normalizeCreativeBrief({ wishes: "Princesas e rosas" }), layout: [1, 2, 3] };
    const packed = packJobContext("owner", context);
    expect(Object.values(packed).every((v) => v.length <= 512)).toBe(true);
    expect(unpackJobContext(packed, "owner")).toEqual(context);
    expect(() => unpackJobContext(packed, "other")).toThrow();
  });
});

describe("areas de personalizacao dos moldes", () => {
  const dir = resolve("supabase/assets/mold-faces");
  for (const file of readdirSync(dir).filter((name) => name.endsWith(".json"))) {
    it(`reserva nome dentro das areas seguras: ${file}`, () => {
      const data = JSON.parse(readFileSync(resolve(dir, file), "utf8"));
      const layout = buildArtLayout({ width: data.W, height: data.H, faces: data.faces }, file);
      expect(isArtLayout(layout)).toBe(true);
      for (const zone of layout.labels) {
        const x = zone.x * data.W, y = zone.y * data.H;
        expect(data.faces.some((face: { safeX: number; safeY: number; safeW: number; safeH: number }) =>
          x >= face.safeX - 0.01 && y >= face.safeY - 0.01
          && x + zone.w * data.W <= face.safeX + face.safeW + 0.01
          && y + zone.h * data.H <= face.safeY + face.safeH + 0.01)).toBe(true);
      }
    });
  }
  it("quebra nomes em linhas sem comprimir as letras", () => {
    const fitted = fitNameLines("Maria Eduarda Santos", 220, 90, 35, (text, size) => text.length * size * 0.6);
    expect(fitted.lines.length).toBe(2);
    expect(fitted.lines.join(" ")).toBe("Maria Eduarda Santos");
    expect(fitted.lines.every((line) => line.length * fitted.size * 0.6 <= 220)).toBe(true);
  });
  it("recusa textos impossiveis em vez de cortar ou esmagar", () => {
    expect(() => fitNameLines("W".repeat(80), 100, 40, 25, (text, size) => text.length * size)).toThrow();
  });
});
