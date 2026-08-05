import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/gerar-mockup/index.ts"),
  "utf8",
);

describe("preservação da arte no mockup", () => {
  it("sempre edita a arte aprovada enviada pelo editor", () => {
    expect(source).toContain('{ type: "input_image", image_url: arteImageUrl, detail: "high" }');
    expect(source).toContain('action: "edit"');
    expect(source).toContain("A imagem anexa é a arte final aprovada vinda do acervo do Drive");
  });

  it("retenta sem descrever a propriedade visual e sem substituir a fonte", () => {
    expect(source).toContain("MOCKUP_SOURCE_PRESERVATION_FAILED");
    expect(source).toContain("safeMode");
    expect(source).toContain("Preserve os pixels da arte anexa");
    expect(source).not.toContain("startQualityCorrection");
    expect(source).not.toContain("qualityCorrected");
    expect(source).not.toContain('status: "retrying"');
  });

  it("adapta e revisa o cenário conforme o público final da festa", () => {
    expect(source).toContain("resolveMockupPersona");
    expect(source).toContain("Público e linguagem visual obrigatórios");
    expect(source).toContain("Regra de público");
    expect(source).toContain("adequação ao público da festa");
    expect(source).toContain("MOCKUP_QUALITY_REJECTED");
    expect(source).toContain("Nenhuma versão inadequada foi entregue");
  });

  it("exige uma mesa de festa completa com bolo, balões e conjunto de lembrancinhas", () => {
    expect(source).toContain("mesa principal de aniversário completa");
    expect(source).toContain("arco ou arranjo volumoso de balões");
    expect(source).toContain("bolo temático inteiro e reconhecível");
    expect(source).toContain("de três a sete lembrancinhas adicionais");
    expect(source).toContain("party_table_ok");
    expect(source).toContain("balloon_arch_ok");
    expect(source).toContain("themed_cake_ok");
    expect(source).toContain("souvenir_display_ok");
    expect(source).toContain("theme_cohesion_ok");
    expect(source).toContain("40% a 65% do quadro");
    expect(source).not.toContain("65% a 88% do quadro");
  });

  it("exige laço físico premium sem cobrir a personalização", () => {
    expect(source).toContain("exatamente um laço físico bem-feito de fita de cetim ou gorgurão");
    expect(source).toContain("duas alças simétricas, nó central definido, caudas curtas");
    expect(source).toContain("sem cobrir nome, idade, personagem, abertura, recorte ou estrutura");
    expect(source).toContain("bow_finish_ok");
    expect(source).toContain("se faltar o laço físico na unidade principal");
  });
});
