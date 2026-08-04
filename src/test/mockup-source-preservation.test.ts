import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/gerar-mockup/index.ts"),
  "utf8",
);

describe("preservação da arte no mockup", () => {
  it("sempre edita a arte aprovada enviada pelo editor", () => {
    expect(source).toContain('{ type: "input_image", image_url: arteImageUrl }');
    expect(source).toContain('action: "edit"');
    expect(source).toContain("A imagem anexa é a arte final aprovada vinda do acervo do Drive");
  });

  it("não cria nem corrige uma estampa substituta", () => {
    expect(source).toContain("MOCKUP_SOURCE_PRESERVATION_FAILED");
    expect(source).not.toContain("safeMode");
    expect(source).not.toContain("startQualityCorrection");
    expect(source).not.toContain("qualityCorrected");
    expect(source).not.toContain('status: "retrying"');
  });
});
