import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/gerar-arte/index.ts"),
  "utf8",
);
const standardSource = readFileSync(
  resolve(process.cwd(), "supabase/functions/_shared/alice-quality-standard.ts"),
  "utf8",
);
const composerSource = readFileSync(
  resolve(process.cwd(), "src/lib/compose-kit.ts"),
  "utf8",
);

describe("curadoria comercial da arte gerada", () => {
  it("avalia a arte final antes do upload e reprova composicao fraca", () => {
    expect(source).toContain("reviewGeneratedArt(");
    expect(source).toContain("buildAliceCuratorStandard()");
    expect(source).toContain('code: "ART_QUALITY_REJECTED"');
    expect(source.indexOf("reviewGeneratedArt(", source.indexOf("async function handleStatus")))
      .toBeLessThan(source.indexOf('.from("artes-geradas")', source.indexOf("async function handleStatus")));
  });

  it("mede os dez pilares e exige uma segunda direcao de arte", () => {
    for (const criterion of [
      "technical_structure_ok",
      "visible_coverage_ok",
      "focal_hierarchy_ok",
      "color_system_ok",
      "depth_layering_ok",
      "theme_storytelling_ok",
      "personalization_ok",
      "commercial_impact_ok",
      "originality_ok",
      "print_finish_ok",
    ]) {
      expect(source).toContain(criterion);
    }
    expect(source).toContain("SEGUNDA TENTATIVA DE QUALIDADE");
    expect(source).toContain("Refaca a direcao visual");
    expect(source).toContain("getThemeStoryDirection");
    expect(source).toContain("TEMA OBRIGATORIO");
    expect(source).toContain("CRITICA VISUAL DA TENTATIVA ANTERIOR");
  });

  it("usa a auditoria de 236 anuncios sem atribuir dados nao verificados a Shopee", () => {
    expect(standardSource).toContain('version: "market-ml-2026-08-05-r1"');
    expect(standardSource).toContain("sampleSize: 236");
    expect(standardSource).toContain("paletteRecoloredAreaMin: 35");
    expect(standardSource).toContain("Shopee: login necessario durante a coleta");
    expect(composerSource).toContain('id="market-research-version"');
    expect(composerSource).toContain('id="market-reference-sample-size"');
  });
});
