export function packJobContext(owner: string, context: Record<string, unknown>) {
  const serialized = JSON.stringify(context);
  if (serialized.length > 6500) throw new Error("Briefing muito grande.");
  const metadata: Record<string, string> = { owner, contextVersion: "1" };
  for (let i = 0; i < serialized.length; i += 500) metadata[`ctx${i / 500}`] = serialized.slice(i, i + 500);
  return metadata;
}

export function unpackJobContext(metadata: Record<string, string> | undefined, owner: string) {
  if (!owner || metadata?.owner !== owner || metadata.contextVersion !== "1") {
    throw new Error("Esta geracao nao pertence a sua sessao ou foi iniciada em uma versao anterior.");
  }
  let json = "";
  for (let i = 0; i < 13 && metadata[`ctx${i}`] !== undefined; i++) json += metadata[`ctx${i}`];
  return JSON.parse(json) as Record<string, unknown>;
}
