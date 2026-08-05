import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

function readEnv() {
  const values = {};
  for (const file of [".env", ".env.gerador"]) {
    const path = resolve(ROOT, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (match) values[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
    }
  }
  return values;
}

const env = readEnv();
const baseUrl = env.VITE_SUPABASE_URL;
const apiKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!baseUrl || !apiKey) throw new Error("Credenciais públicas do Supabase não encontradas.");

async function rest(path) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Range: "0-9999" },
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const normalize = (value = "") =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function isHero(asset) {
  if (asset.kind !== "clipart" || !asset.url || asset.meta?.enabled === false) return false;
  if (asset.meta?.usage) return asset.meta.usage === "hero";
  if (/placa|ornamento|decoracao|borda|border|faixa|painel|panel/.test(normalize(asset.role))) return false;
  const ratio = asset.meta?.w && asset.meta?.h ? asset.meta.w / asset.meta.h : 1;
  return ratio < 2.15;
}

function themeIssues(assets) {
  const active = assets.filter((asset) => asset.url && asset.meta?.enabled !== false);
  const heroes = active.filter(isHero);
  const issues = [];
  if (!heroes.some((asset) => asset.role === "principal")) issues.push("sem principal");
  if (new Set(heroes.map((asset) => asset.url)).size < 2) issues.push("menos de 2 herois");
  if (!active.some((asset) => asset.kind === "papel" && asset.role === "top")) issues.push("sem papel top");
  if (!active.some((asset) => asset.kind === "papel" && asset.role === "body")) issues.push("sem papel body");
  if (!active.some((asset) => asset.kind === "fonte")) issues.push("sem fonte");
  return issues;
}

async function checkUrl(url) {
  try {
    let response = await fetch(url, { method: "HEAD", redirect: "follow" });
    if (!response.ok && [403, 405].includes(response.status)) {
      response = await fetch(url, { headers: { Range: "bytes=0-0" }, redirect: "follow" });
    }
    return response.ok ? null : `HTTP ${response.status}`;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function checkUrls(urls, concurrency = 16) {
  const queue = [...urls];
  const failures = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const error = await checkUrl(url);
      if (error) failures.push({ url, error });
    }
  }));
  return failures;
}

const [assets, molds, catalog, readyFiles] = await Promise.all([
  rest("tema_assets?select=theme_slug,kind,name,url,role,meta"),
  rest("moldes?select=id,name,image_url,svg_url,mask_url,faces_url,template_pdf_url,template_png_url"),
  rest("modelos_prontos_temas?select=slug,name"),
  rest("modelos_prontos_arquivos?select=theme_slug,file_name,url"),
]);

const assetsByTheme = new Map();
for (const asset of assets) {
  const list = assetsByTheme.get(asset.theme_slug) ?? [];
  list.push(asset);
  assetsByTheme.set(asset.theme_slug, list);
}

const incompleteThemes = [...assetsByTheme]
  .map(([slug, list]) => ({ slug, issues: themeIssues(list) }))
  .filter((theme) => theme.issues.length > 0);
const commercialCoverageWarnings = [...assetsByTheme]
  .map(([slug, list]) => ({
    slug,
    heroes: new Set(list.filter(isHero).map((asset) => asset.url)).size,
  }))
  .filter((theme) => theme.heroes >= 2 && theme.heroes < 4);
const catalogSlugs = new Set(catalog.map((theme) => theme.slug));
const assetSlugs = new Set(assetsByTheme.keys());
const catalogWithoutAssets = [...catalogSlugs].filter((slug) => !assetSlugs.has(slug));
const assetsWithoutCatalog = [...assetSlugs].filter((slug) => !catalogSlugs.has(slug));

const moldIssues = molds.flatMap((mold) => {
  const missing = ["image_url", "svg_url", "mask_url", "faces_url"]
    .filter((field) => !mold[field]);
  return missing.length ? [{ mold: mold.name, missing }] : [];
});
const filesByTheme = new Set(readyFiles.map((file) => file.theme_slug));
const emptyCatalogThemes = catalog.map((theme) => theme.slug).filter((slug) => !filesByTheme.has(slug));

const urls = new Set();
for (const asset of assets) if (asset.url) urls.add(asset.url);
for (const mold of molds) {
  for (const field of ["image_url", "svg_url", "mask_url", "faces_url", "template_pdf_url", "template_png_url"]) {
    if (mold[field]) urls.add(mold[field]);
  }
}
for (const file of readyFiles) if (file.url) urls.add(file.url);

const urlFailures = await checkUrls(urls);
const failures = {
  incompleteThemes,
  catalogWithoutAssets,
  assetsWithoutCatalog,
  moldIssues,
  emptyCatalogThemes,
  urlFailures,
};
const failed = Object.values(failures).some((items) => items.length > 0);

console.log(JSON.stringify({
  ok: !failed,
  totals: {
    themes: assetsByTheme.size,
    assets: assets.length,
    molds: molds.length,
    catalogThemes: catalog.length,
    readyFiles: readyFiles.length,
    checkedUrls: urls.size,
    commercialCoverageWarnings: commercialCoverageWarnings.length,
  },
  warnings: { commercialCoverageWarnings },
  failures,
}, null, 2));

if (failed) process.exitCode = 1;
