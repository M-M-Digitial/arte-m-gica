import { supabase } from "@/integrations/supabase/client";
import { criarSvgDaArte } from "./svg-arte";
import { svgToPngDataUrl } from "./compose-kit";
import type { ArtPersonalization } from "./art-personalization";
import { isArtLayout, type ArtLayout } from "../../supabase/functions/_shared/art-layout";
import { normalizeCreativeBrief, type CreativeBrief } from "../../supabase/functions/_shared/art-direction";

export interface ArtRecipe {
  version: 1;
  baseImage: string;
  moldSvgUrl: string;
  layout: ArtLayout;
  brief: CreativeBrief;
  signature: string;
  personalization: ArtPersonalization;
}

function trustedStorage(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(import.meta.env.VITE_SUPABASE_URL).origin
      && parsed.pathname.startsWith("/storage/v1/object/public/");
  } catch { return false; }
}

export async function renderArtRecipe(recipe: ArtRecipe) {
  const svg = await criarSvgDaArte({
    imagem: recipe.baseImage,
    moldeSvgUrl: recipe.moldSvgUrl,
    nomeArquivo: `molde-${recipe.personalization.name}`,
    personalization: { layout: recipe.layout, value: recipe.personalization },
  });
  const png = await svgToPngDataUrl(svg, recipe.layout.width);
  return { svg, png };
}

/** Companion recipe keeps old history rows compatible without a schema migration. */
export async function loadArtRecipe(imageUrl: string): Promise<ArtRecipe | null> {
  if (!trustedStorage(imageUrl) || !imageUrl.endsWith(".png")) return null;
  const url = imageUrl.replace(/\.png$/, ".recipe.json");
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error("Nao foi possivel carregar a receita da arte.");
  const recipe = await response.json() as ArtRecipe;
  if (recipe.version !== 1 || !isArtLayout(recipe.layout) || !trustedStorage(recipe.baseImage)
    || !trustedStorage(recipe.moldSvgUrl) || typeof recipe.signature !== "string" || !recipe.personalization
    || typeof recipe.personalization.name !== "string" || typeof recipe.personalization.age !== "string"
    || typeof recipe.personalization.phrase !== "string") {
    throw new Error("Receita da arte invalida; nenhuma geracao foi iniciada.");
  }
  recipe.brief = normalizeCreativeBrief(recipe.brief);
  return recipe;
}

export async function saveArtRecipe(userId: string, recipe: ArtRecipe, result: { svg: string; png: string }) {
  const bucket = supabase.storage.from("artes-geradas");
  const path = `${userId}/${crypto.randomUUID()}`;
  const png = await (await fetch(result.png)).blob();
  const savedRecipe = { ...recipe };
  if (recipe.baseImage.startsWith("data:image/")) {
    const base = await (await fetch(recipe.baseImage)).blob();
    const { error } = await bucket.upload(`${path}.base.png`, base, { contentType: "image/png" });
    if (error) throw error;
    savedRecipe.baseImage = bucket.getPublicUrl(`${path}.base.png`).data.publicUrl;
  }
  // Publish the recipe before the thumbnail: a visible history entry is always reusable.
  for (const [suffix, data, contentType] of [
    [".recipe.json", JSON.stringify(savedRecipe), "application/json"],
    [".svg", result.svg, "image/svg+xml"],
    [".png", png, "image/png"],
  ] as const) {
    const { error } = await bucket.upload(`${path}${suffix}`, data, { contentType });
    if (error) throw error;
  }
  return { imageUrl: bucket.getPublicUrl(`${path}.png`).data.publicUrl, recipe: savedRecipe };
}
