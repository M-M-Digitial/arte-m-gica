export const IMAGE_MODELS = {
  art: "gpt-image-2.5-sunburst",
  draft: "gpt-image-2.5-flare",
  mockup: "gpt-image-2.5-sunburst",
  curator: "gpt-5.4-mini",
} as const;

export function imageModelFor(quality: unknown, purpose: "art" | "mockup" = "art") {
  return quality === "low" ? IMAGE_MODELS.draft : IMAGE_MODELS[purpose];
}

/** Preserve the dieline aspect ratio; the API requires dimensions divisible by 16. */
export function imageOutputSize(width: number, height: number, quality: unknown) {
  if (![width, height].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("Dimensoes do molde invalidas.");
  }
  if (Math.max(width / height, height / width) > 3) {
    throw new Error("Este molde precisa de uma pagina com proporcao de ate 3:1.");
  }
  const longest = quality === "low" ? 1536 : 2048;
  const scale = longest / Math.max(width, height);
  return `${Math.round(width * scale / 16) * 16}x${Math.round(height * scale / 16) * 16}`;
}
