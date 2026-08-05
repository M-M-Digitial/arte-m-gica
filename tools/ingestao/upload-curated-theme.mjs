import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { prepareCharacterPng } from "./prepare-character.mjs";

const PROJECT_URL = "https://qdwhwxboocplmnmczkfj.supabase.co";
const BUCKET = "moldes";
const PUBLIC_URL = `${PROJECT_URL}/storage/v1/object/public/${BUCKET}`;
const [configArg] = process.argv.slice(2);
if (!configArg) {
  console.error("uso: <api-keys.json> | node upload-curated-theme.mjs <curadoria.json>");
  process.exit(1);
}

let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
const serviceKey = (JSON.parse(stdin.replace(/^\uFEFF/, "")).find((key) => key.name === "service_role") || {}).api_key;
if (!serviceKey) throw new Error("service_role ausente");

const configPath = resolve(configArg);
const config = JSON.parse(readFileSync(configPath, "utf8"));
if (!config.slug || !Array.isArray(config.assets) || !config.assets.length) {
  throw new Error("Curadoria deve informar slug e assets.");
}

const uploaded = [];
for (const [index, asset] of config.assets.entries()) {
  const sourcePath = resolve(dirname(configPath), asset.path);
  if (!existsSync(sourcePath)) throw new Error(`Asset nao encontrado: ${sourcePath}`);
  const source = readFileSync(sourcePath);
  const sourceSha256 = createHash("sha256").update(source).digest("hex");
  if (asset.sourceSha256 && asset.sourceSha256 !== sourceSha256) {
    throw new Error(`SHA-256 divergente: ${asset.path}`);
  }

  const prepared = await prepareCharacterPng(source, config.maxDimension ?? 1800);
  const storagePath = `temas/${config.slug}/${asset.name}`;
  const response = await fetch(`${PROJECT_URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "image/png",
      "x-upsert": "true",
    },
    body: prepared.buffer,
  });
  if (!response.ok) throw new Error(`${storagePath}: HTTP ${response.status} ${await response.text()}`);

  uploaded.push({
    theme_slug: config.slug,
    kind: "clipart",
    name: asset.name,
    url: `${PUBLIC_URL}/${storagePath}`,
    role: asset.role ?? (index === 0 ? "principal" : `variacao-${index + 1}`),
    meta: {
      w: prepared.width,
      h: prepared.height,
      usage: asset.usage ?? "hero",
      enabled: true,
      source: "alice-drive-studio",
      driveThemeFolderId: config.driveThemeFolderId,
      sourceFile: asset.sourceFile,
      sourceSha256,
      curation: config.curation ?? "drive-character-coverage-v1",
      copyright: "licensed-by-alice",
      label: asset.label,
    },
  });
}

const resultPath = resolve(dirname(configPath), `${config.slug}-uploaded.json`);
writeFileSync(resultPath, `${JSON.stringify(uploaded, null, 2)}\n`);
console.log(JSON.stringify({ slug: config.slug, uploaded: uploaded.length, resultPath, assets: uploaded }, null, 2));
