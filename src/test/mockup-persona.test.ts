import { describe, expect, it } from "vitest";
import { resolveMockupPersona } from "../../supabase/functions/_shared/mockup-persona";

describe("persona da foto de divulgação", () => {
  it("prioriza a idade infantil mesmo em temas com acabamento delicado", () => {
    const persona = resolveMockupPersona("A Era do Gelo", "2 anos");
    expect(persona.key).toBe("infantil");
    expect(persona.forbiddenDirection).toContain("flores secas");
    expect(persona.reviewRule).toContain("festa adulta");
  });

  it("diferencia festas teen e adultas temáticas", () => {
    expect(resolveMockupPersona("Festa Neon", "15").key).toBe("teen");
    expect(resolveMockupPersona("Boteco", "40").key).toBe("adulto");
    expect(resolveMockupPersona("Casamento", "").key).toBe("adulto");
  });

  it("mantém temas do catálogo infantil como padrão quando não há idade", () => {
    expect(resolveMockupPersona("Baby Shark", "").key).toBe("infantil");
    expect(resolveMockupPersona("Dragon Ball Z", "").key).toBe("infantil");
  });
});
