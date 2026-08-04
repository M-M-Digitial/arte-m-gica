import { describe, expect, it } from "vitest";
import {
  ALICE_QUALITY_STANDARD,
  buildAliceCuratorStandard,
  buildAliceGenerationStandard,
} from "../../supabase/functions/_shared/alice-quality-standard";

describe("padrão Alice e mercado", () => {
  it("mantém as proporções observadas nas referências", () => {
    expect(ALICE_QUALITY_STANDARD.evidence.aliceThemesReviewed).toBe(30);
    expect(ALICE_QUALITY_STANDARD.layout.floorBand.target).toBe(25);
    expect(ALICE_QUALITY_STANDARD.layout.heroHeight.target).toBe(68);
    expect(ALICE_QUALITY_STANDARD.layout.modularElementHeight.target).toBe(40);
    expect(ALICE_QUALITY_STANDARD.layout.nameFaceElementHeight.target).toBe(52);
    expect(ALICE_QUALITY_STANDARD.layout.modularCalmArea.target).toBe(55);
    expect(ALICE_QUALITY_STANDARD.layout.namePlateWidth.target).toBe(50);
    expect(ALICE_QUALITY_STANDARD.layout.milkNamePlateWidth.target).toBe(38);
    expect(ALICE_QUALITY_STANDARD.layout.ageToNameFontRatio.target).toBe(0.42);
    expect(ALICE_QUALITY_STANDARD.layout.decoratedDensity.target).toBe(58);
    expect(ALICE_QUALITY_STANDARD.layout.sceneActiveFacesPct).toBe(100);
    expect(ALICE_QUALITY_STANDARD.layout.distinctCharacterAssetsBeforeRepeat).toBe(4);
  });

  it("aplica a orientacao gravada para a Caixa Milk", () => {
    const prompt = buildAliceGenerationStandard({ moldName: "Caixa Milk", name: "Flora", age: "3" });
    expect(prompt).toContain("duas faces laterais alternadas");
    expect(prompt).toContain("parte inferior da area visivel");
    expect(prompt).toContain("fonte delicada e menor");
    expect(prompt).toContain("nao deixe uma segunda face inteira vazia");
    expect(prompt).toContain("pelo menos tres decisoes estruturais");
    expect(prompt).toContain("Nao espelhe o mesmo arquivo");
  });

  it("leva personalização e portas críticas para o gerador", () => {
    const prompt = buildAliceGenerationStandard({ moldName: "Caixa Bala", name: "Sofia", age: "5" });
    expect(prompt).toContain('molde "Caixa Bala"');
    expect(prompt).toContain('nome deve ser exatamente "Sofia"');
    expect(prompt).toContain('idade "5"');
    expect(prompt).toContain("Alcas recebem continuidade visual");
    expect(prompt).toContain("Fundo claro tratado");
    expect(prompt).toContain("MODULAR");
  });

  it("fornece uma rubrica de 100 pontos para a curadora", () => {
    const total = Object.values(ALICE_QUALITY_STANDARD.score).reduce((sum, value) => sum + value, 0);
    const rubric = buildAliceCuratorStandard();
    expect(total).toBe(100);
    expect(rubric).toContain("Estrutura tecnica (25)");
    expect(rubric).toContain("Originalidade (10)");
    expect(rubric).toContain("Fundo claro tratado nao e falha");
    expect(rubric).toContain("personagens e poses distintos");
    expect(rubric).toContain("Qualquer porta critica falha impede APROVADO");
  });
});
