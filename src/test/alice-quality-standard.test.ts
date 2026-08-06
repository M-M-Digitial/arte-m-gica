import { describe, expect, it } from "vitest";
import {
  ALICE_QUALITY_STANDARD,
  buildAliceCuratorStandard,
  buildAliceGenerationStandard,
} from "../../supabase/functions/_shared/alice-quality-standard";

describe("padrão Alice e mercado", () => {
  it("mantém as proporções observadas nas referências", () => {
    expect(ALICE_QUALITY_STANDARD.evidence.aliceThemesReviewed).toBe(30);
    expect(ALICE_QUALITY_STANDARD.evidence.aliceLibraryThemesMapped).toBe(100);
    expect(ALICE_QUALITY_STANDARD.evidence.aliceStudioSourcesMapped).toBe(490);
    expect(ALICE_QUALITY_STANDARD.evidence.marketReferencesReviewed).toBeGreaterThanOrEqual(16);
    expect(ALICE_QUALITY_STANDARD.evidence.marketReferencesReviewed).toBe(586);
    expect(ALICE_QUALITY_STANDARD.layout.floorBand.target).toBe(25);
    expect(ALICE_QUALITY_STANDARD.layout.heroHeight.target).toBe(78);
    expect(ALICE_QUALITY_STANDARD.layout.modularElementHeight.target).toBe(72);
    expect(ALICE_QUALITY_STANDARD.layout.nameFaceElementHeight.target).toBe(76);
    expect(ALICE_QUALITY_STANDARD.layout.modularCalmArea.target).toBe(55);
    expect(ALICE_QUALITY_STANDARD.layout.namePlateWidth.target).toBe(76);
    expect(ALICE_QUALITY_STANDARD.layout.milkNamePlateWidth.target).toBe(64);
    expect(ALICE_QUALITY_STANDARD.layout.ageToNameFontRatio.target).toBe(0.42);
    expect(ALICE_QUALITY_STANDARD.layout.decoratedDensity.target).toBe(66);
    expect(ALICE_QUALITY_STANDARD.layout.sceneActiveFacesPct).toBe(100);
    expect(ALICE_QUALITY_STANDARD.layout.distinctCharacterAssetsBeforeRepeat).toBe(4);
    expect(ALICE_QUALITY_STANDARD.commercialArt.visualLayers.target).toBe(3);
    expect(ALICE_QUALITY_STANDARD.commercialArt.paletteColors.target).toBe(4);
    expect(ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore).toBe(86);
    expect(ALICE_QUALITY_STANDARD.layout.premiumBow.widthToPlate.target).toBe(28);
  });

  it("aplica a orientacao gravada para a Caixa Milk", () => {
    const prompt = buildAliceGenerationStandard({ moldName: "Caixa Milk", name: "Flora", age: "3" });
    expect(prompt).toContain("primeiro e o quarto paineis como laterais");
    expect(prompt).toContain("segundo como frente");
    expect(prompt).toContain("A frente recebe o personagem principal, maior e mais vistoso");
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
    expect(prompt).toContain("DIRECAO DE ARTE COMERCIAL");
    expect(prompt).toContain("PROFUNDIDADE EM TRES PLANOS");
    expect(prompt).toContain("CENA CONTINUA ENTRE FACES");
    expect(prompt).toContain("VINCOS SEPARAM ELEMENTOS FOCAIS");
    expect(prompt).toContain("fragmento isolado do outro lado do vinco");
    expect(prompt).toContain("FACE DO NOME TAMBEM E ARTE");
    expect(prompt).toContain("Proibido usar tres confetes");
    expect(prompt).toContain("TESTE DE MINIATURA");
    expect(prompt).toContain("exatamente um lacinho grafico refinado");
    expect(prompt).toContain("nunca cobrir nome, idade, personagem, recorte ou linha tecnica");
    expect(prompt).toContain("350 referencias do Google Imagens");
    expect(prompt).toContain("apenas 56 anuncios de papelaria personalizada");
    expect(prompt).toContain("Fotos de mesas, kits decorativos e mockups servem apenas para contexto comercial");
    expect(prompt).toContain("saturacao isolada nunca aprova beleza");
  });

  it("fornece uma rubrica de 100 pontos para a curadora", () => {
    const total = Object.values(ALICE_QUALITY_STANDARD.score).reduce((sum, value) => sum + value, 0);
    const rubric = buildAliceCuratorStandard();
    expect(total).toBe(100);
    expect(rubric).toContain("Estrutura tecnica (20)");
    expect(rubric).toContain("Hierarquia focal (12)");
    expect(rubric).toContain("Impacto comercial (10)");
    expect(rubric).toContain("Originalidade (5)");
    expect(rubric).toContain("Fundo claro tratado nao e falha");
    expect(rubric).toContain("personagens e poses distintos");
    expect(rubric).toContain("Qualquer porta critica falha impede APROVADO");
    expect(rubric).toContain("simples, plana ou generica");
    expect(rubric).toContain("lacinho grafico vetorial bem integrado");
    expect(rubric).toContain("continuidade entre faces");
    expect(rubric).toContain("exatamente um molde");
    expect(rubric).toContain("sem personagem repartido entre faces");
    expect(rubric).toContain("confete generico usado para simular acabamento");
    expect(rubric).toContain("resultados da Shopee apenas indexados");
    expect(rubric).toContain("Nao aprove ou reprove por saturacao isolada");
  });
});
