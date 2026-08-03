import { describe, expect, it } from "vitest";
import { agentIds, agents, getAgentById, getCanonicalAgentId } from "@/data/agents";

describe("catálogo do Meu Ateliê Digital", () => {
  it("expõe exatamente as nove assistentes prometidas", () => {
    expect(agentIds).toEqual([
      "nina",
      "iris",
      "clara",
      "violeta",
      "sofia",
      "bella",
      "cora",
      "elisa",
      "maia",
    ]);
    expect(agents).toHaveLength(9);
    expect(new Set(agents.map((agent) => agent.id)).size).toBe(9);
  });

  it("mantém conversas antigas nos agentes sucessores", () => {
    expect(getCanonicalAgentId("malu")).toBe("nina");
    expect(getCanonicalAgentId("jade")).toBe("nina");
    expect(getCanonicalAgentId("luna")).toBe("elisa");
    expect(getCanonicalAgentId("flora")).toBe("maia");
    expect(getAgentById("luna")?.name).toBe("Elisa");
  });

  it("oferece entregas e inícios rápidos para cada assistente", () => {
    for (const agent of agents) {
      expect(agent.deliverables.length).toBeGreaterThanOrEqual(3);
      expect(agent.starters.length).toBeGreaterThanOrEqual(3);
      expect(agent.description.length).toBeGreaterThan(40);
    }
  });
});
