import { ALICE_QUALITY_STANDARD } from "./alice-quality-standard.ts";
import { IMAGE_MODELS } from "./image-models.ts";
import { buildBriefCuratorRules, type CreativeBrief } from "./art-direction.ts";
import { describeArtLayout, type ArtLayout } from "./art-layout.ts";
import { bytesToBase64 } from "./image-bytes.ts";
type AliceReferenceImage = { dataUrl: string; kind: string; role: string };

interface ArtQualityReview {
  approved: boolean;
  score: number;
  technical_structure_ok: boolean;
  visible_coverage_ok: boolean;
  focal_hierarchy_ok: boolean;
  color_system_ok: boolean;
  depth_layering_ok: boolean;
  theme_storytelling_ok: boolean;
  personalization_ok: boolean;
  commercial_impact_ok: boolean;
  originality_ok: boolean;
  print_finish_ok: boolean;
  issues: string[];
  correction_prompt: string;
}

function responseOutputText(response: Record<string, any>): string {
  return ((response.output ?? []) as Array<Record<string, any>>)
    .filter((item) => item.type === "message")
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item) => item?.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

export async function reviewGeneratedArt(
  imageBytes: Uint8Array,
  templateBytes: Uint8Array | null,
  context: { moldeName: string; temaNome: string; nome: string; idade: string; brief: CreativeBrief; artLayout: ArtLayout | null },
  OPENAI_API_KEY: string,
  references: AliceReferenceImage[] = [],
): Promise<ArtQualityReview | null> {
  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: `Avalie a arte planificada final comparando-a com o gabarito tecnico.
Molde: ${context.moldeName || "nao informado"}.
Tema: ${context.temaNome || "nao informado"}.
${context.artLayout ? describeArtLayout(context.artLayout) : `Nome esperado: ${context.nome}; idade: ${context.idade}.`}
Teste a leitura da arte como miniatura de 320 px e a integridade das faces. Gere correcoes concretas.
${buildBriefCuratorRules(context.brief, !!context.artLayout)}`,
    },
  ];
  if (templateBytes) {
    content.push({
      type: "input_text",
      text: "Primeira imagem: gabarito tecnico original. Use-a somente para conferir estrutura, corte, dobra, vazados e areas externas.",
    });
    content.push({
      type: "input_image",
      image_url: `data:image/png;base64,${bytesToBase64(templateBytes)}`,
      detail: "high",
    });
  }
  content.push({
    type: "input_text",
    text: "Imagem final a avaliar:",
  });
  content.push({
    type: "input_image",
    image_url: `data:image/png;base64,${bytesToBase64(imageBytes)}`,
    detail: "high",
  });

  for (const reference of references.slice(0, 5)) {
    content.push({ type: "input_text", text: `Referencia Alice (${reference.kind}, ${reference.role}): comparar identidade e acabamento, NAO exigir copia.` });
    content.push({ type: "input_image", image_url: reference.dataUrl, detail: "high" });
  }
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: IMAGE_MODELS.curator,
      store: false,
      reasoning: { effort: "low" },
      max_output_tokens: 2400,
      instructions: `Voce e o agente curador final de um estudio brasileiro de papelaria personalizada premium. Seja rigoroso, visual e comercial. Aprove somente com nota minima ${ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore}, todas as portas criticas preservadas e todos os criterios booleanos verdadeiros. Nao premie apenas preenchimento: diferencie elaboracao organizada de poluicao visual.`,
      input: [{ role: "user", content }],
      text: {
        format: {
          type: "json_schema",
          name: "art_quality_review",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              approved: { type: "boolean" },
              score: { type: "integer", minimum: 0, maximum: 100 },
              technical_structure_ok: { type: "boolean" },
              visible_coverage_ok: { type: "boolean" },
              focal_hierarchy_ok: { type: "boolean" },
              color_system_ok: { type: "boolean" },
              depth_layering_ok: { type: "boolean" },
              theme_storytelling_ok: { type: "boolean" },
              personalization_ok: { type: "boolean" },
              commercial_impact_ok: { type: "boolean" },
              originality_ok: { type: "boolean" },
              print_finish_ok: { type: "boolean" },
              issues: { type: "array", items: { type: "string" }, maxItems: 8 },
              correction_prompt: { type: "string" },
            },
            required: [
              "approved",
              "score",
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
              "issues",
              "correction_prompt",
            ],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    console.warn("Art quality review failed:", response.status, await response.text().catch(() => ""));
    return null;
  }

  try {
    const parsed = JSON.parse(responseOutputText(await response.json())) as ArtQualityReview;
    const allCriteria = parsed.technical_structure_ok
      && parsed.visible_coverage_ok
      && parsed.focal_hierarchy_ok
      && parsed.color_system_ok
      && parsed.depth_layering_ok
      && parsed.theme_storytelling_ok
      && parsed.personalization_ok
      && parsed.commercial_impact_ok
      && parsed.originality_ok
      && parsed.print_finish_ok;
    return {
      ...parsed,
      approved: parsed.approved
        && parsed.score >= ALICE_QUALITY_STANDARD.commercialArt.minimumApprovalScore
        && allCriteria,
      issues: Array.isArray(parsed.issues) ? parsed.issues.slice(0, 8) : [],
    };
  } catch (error) {
    console.warn("Art quality review parse failed:", error);
    return null;
  }
}
