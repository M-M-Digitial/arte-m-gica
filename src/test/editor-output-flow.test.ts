import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const editor = readFileSync(resolve(process.cwd(), "src/pages/Editor.tsx"), "utf8");
const imageJob = readFileSync(resolve(process.cwd(), "src/lib/image-job.ts"), "utf8");

describe("fluxo final do compositor", () => {
  it("mantém a arte final aberta e não dispara mockup automaticamente", () => {
    expect(editor).toContain('setResultadoTab("arte")');
    expect(editor).not.toMatch(/setResultadoTab\("mockup"\);\s*await gerarMockup/);
    expect(editor).toContain("Gerar foto de divulgação");
  });

  it("entrega o resultado pelo exportador SVG dedicado", () => {
    expect(editor).toContain("baixarArquivoSvg");
    expect(editor).not.toContain("downloadText(`kit-");
    expect(editor).toContain("baixarMoldePng");
    expect(editor).toContain("baixarMoldePdf");
    expect(editor).toContain("Molde PNG");
    expect(editor).toContain("Molde PDF");
    expect(editor).toContain('baixarMockup("png")');
    expect(editor).toContain('baixarMockup("jpg")');
  });

  it("retenta uma foto rejeitada pela curadoria sem substituir a arte", () => {
    expect(imageJob).toContain('"MOCKUP_QUALITY_REJECTED"');
    expect(imageJob).toContain("qualityRetry: true");
  });

  it("retenta uma arte reprovada pela curadoria comercial", () => {
    expect(imageJob).toContain('"ART_QUALITY_REJECTED"');
    expect(imageJob).toContain('code === "MOCKUP_QUALITY_REJECTED" || code === "ART_QUALITY_REJECTED"');
    expect(imageJob).toContain("qualityCorrection: qualityReview.correction_prompt");
  });
});
