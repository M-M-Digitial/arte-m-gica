import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { buildSync } from "esbuild";
import { JSDOM } from "jsdom";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const facesOverrideDir = process.env.AUDIT_FACES_DIR
  ? resolve(ROOT, process.env.AUDIT_FACES_DIR)
  : null;
const metricsCachePath = resolve(HERE, ".audit-image-metrics.json");
const metricsCache = existsSync(metricsCachePath)
  ? JSON.parse(readFileSync(metricsCachePath, "utf8"))
  : { trim: {}, paper: {} };
let metricsCacheDirty = false;

const persistMetricsCache = () => {
  if (!metricsCacheDirty) return;
  writeFileSync(metricsCachePath, JSON.stringify(metricsCache));
  metricsCacheDirty = false;
};

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
if (!baseUrl || !apiKey) throw new Error("Credenciais publicas do Supabase nao encontradas.");

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function fetchWithRetry(url, options, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(400 * 2 ** (attempt - 1));
    }
  }
  throw new Error(`Falha de rede apos ${attempts} tentativas: ${url}`, { cause: lastError });
}

async function rest(path) {
  const response = await fetchWithRetry(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Range: "0-9999" },
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const bundle = (entry, output) => buildSync({
  entryPoints: [entry],
  bundle: true,
  format: "esm",
  outfile: output,
  platform: "neutral",
  logLevel: "silent",
});

const composeBundle = resolve(HERE, ".audit-compose-kit.mjs");
const qualityBundle = resolve(HERE, ".audit-kit-quality.mjs");
bundle(resolve(ROOT, "src/lib/compose-kit.ts"), composeBundle);
bundle(resolve(ROOT, "src/lib/kit-quality.ts"), qualityBundle);

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.DOMParser = dom.window.DOMParser;

const cacheBuster = `?v=${Date.now()}`;
const composer = await import(pathToFileURL(composeBundle).href + cacheBuster);
const curator = await import(pathToFileURL(qualityBundle).href + cacheBuster);

async function mapPool(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}

async function fetchResource(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const mime = (response.headers.get("content-type") || "image/png").split(";")[0];
  return { buffer: Buffer.from(await response.arrayBuffer()), mime };
}

const dataUri = ({ buffer, mime }) => `data:${mime};base64,${buffer.toString("base64")}`;
const auditDataUri = (label) => `data:image/png;base64,${Buffer.from(label).toString("base64")}`;

async function trimImage(resource) {
  const image = await loadImage(resource.buffer);
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const bounds = composer.findVisibleBounds(rgba, canvas.width, canvas.height);
  if (!bounds) {
    return { uri: dataUri(resource), w: image.width, h: image.height, visibleCoverage: 0 };
  }

  let { minX, minY, maxX, maxY } = bounds;
  let visiblePixels = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (rgba[(y * canvas.width + x) * 4 + 3] > 24) visiblePixels++;
    }
  }
  const visibleCoverage = visiblePixels / ((maxX - minX + 1) * (maxY - minY + 1));
  const padding = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(canvas.width - 1, maxX + padding);
  maxY = Math.min(canvas.height - 1, maxY + padding);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const output = createCanvas(width, height);
  output.getContext("2d").drawImage(canvas, minX, minY, width, height, 0, 0, width, height);
  return {
    uri: `data:image/png;base64,${output.toBuffer("image/png").toString("base64")}`,
    w: width,
    h: height,
    visibleCoverage,
  };
}

async function analyzePaper(resource) {
  const image = await loadImage(resource.buffer);
  const canvas = createCanvas(32, 32);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, 32, 32);
  const rgba = context.getImageData(0, 0, 32, 32).data;
  const luminances = [];
  let red = 0;
  let green = 0;
  let blue = 0;
  for (let index = 0; index < 1024; index++) {
    const r = rgba[index * 4];
    const g = rgba[index * 4 + 1];
    const b = rgba[index * 4 + 2];
    red += r;
    green += g;
    blue += b;
    luminances.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const mean = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  const deviation = Math.sqrt(
    luminances.reduce((sum, value) => sum + (value - mean) ** 2, 0) / luminances.length,
  );
  const hex = (value) => Math.round(value / 1024).toString(16).padStart(2, "0");
  return { busy: deviation > 26, corMedia: `#${hex(red)}${hex(green)}${hex(blue)}` };
}

async function cachedTrim(url) {
  if (metricsCache.trim[url]) return metricsCache.trim[url];
  const { w, h, visibleCoverage } = await trimImage(await fetchResource(url));
  const metrics = { w, h, visibleCoverage };
  metricsCache.trim[url] = metrics;
  metricsCacheDirty = true;
  return metrics;
}

async function cachedPaperInfo(url) {
  if (metricsCache.paper[url]) return metricsCache.paper[url];
  const info = await analyzePaper(await fetchResource(url));
  metricsCache.paper[url] = info;
  metricsCacheDirty = true;
  return info;
}

const defaultPalette = (slug, fontAsset) => {
  const known = composer.getDefaultThemePalette?.(slug);
  if (known) return known;
  const primary = /^#[0-9a-f]{6}$/i.test(fontAsset?.meta?.cor ?? "") ? fontAsset.meta.cor : "#D93680";
  const secondary = /^#[0-9a-f]{6}$/i.test(fontAsset?.meta?.cor2 ?? "") ? fontAsset.meta.cor2 : "#F2A900";
  const value = primary.replace("#", "");
  const lighten = (offset) => Math.round(
    Number.parseInt(value.slice(offset, offset + 2), 16)
      + (255 - Number.parseInt(value.slice(offset, offset + 2), 16)) * 0.86,
  ).toString(16).padStart(2, "0");
  return {
    primary,
    secondary,
    background: `#${lighten(0)}${lighten(2)}${lighten(4)}`,
    accent: secondary,
    appearance: "balanced",
  };
};

const paletteVariants = (slug, themePalette) => [
  { id: "tema", ...themePalette, appearance: themePalette.appearance ?? "balanced" },
  {
    id: "vibrante",
    primary: "#E6005C",
    secondary: "#FFD000",
    background: "#29C7D8",
    accent: "#35B84A",
    appearance: "vibrant",
  },
  {
    id: "elegante",
    primary: "#7A2D52",
    secondary: "#C8A44D",
    background: "#F8F3F6",
    accent: "#2F6B5B",
    appearance: "elegant",
  },
].map((palette) => {
  const adapted = composer.adaptThemePalette?.(slug, palette, palette.id) ?? palette;
  return {
    id: palette.id,
    ...adapted,
    appearance: adapted.appearance ?? palette.appearance ?? "balanced",
  };
});

const [assets, rawMolds] = await Promise.all([
  rest("tema_assets?select=theme_slug,kind,name,url,role,meta&order=theme_slug"),
  rest("moldes?select=id,name,svg_url,mask_url,faces_url&order=sort_order,name"),
]);

const molds = await mapPool(rawMolds, 6, async (mold) => {
  if (!mold.svg_url || !mold.mask_url || !mold.faces_url) {
    throw new Error(`Molde incompleto: ${mold.name}`);
  }
  const overridePath = facesOverrideDir
    ? resolve(facesOverrideDir, basename(new URL(mold.faces_url).pathname))
    : null;
  const facesOverride = overridePath && existsSync(overridePath)
    ? readFileSync(overridePath, "utf8")
    : null;
  const [svgResponse, facesResponse] = await Promise.all([
    fetchWithRetry(mold.svg_url),
    facesOverride ? Promise.resolve(null) : fetchWithRetry(mold.faces_url),
  ]);
  if (!svgResponse.ok || (facesResponse && !facesResponse.ok)) {
    throw new Error(`Arquivos indisponiveis: ${mold.name}`);
  }
  return {
    ...mold,
    moldSvg: await svgResponse.text(),
    maskUri: auditDataUri(`mold-${mold.id}-mask`),
    facesJson: facesOverride ?? await facesResponse.text(),
  };
});

const byTheme = new Map();
for (const asset of assets) {
  const themeAssets = byTheme.get(asset.theme_slug) ?? [];
  themeAssets.push(asset);
  byTheme.set(asset.theme_slug, themeAssets);
}

const failures = [];
const scores = [];
let compositions = 0;
let auditedThemes = 0;

await mapPool([...byTheme], 3, async ([slug, themeAssets]) => {
  let completedForTheme = 0;
  try {
  const active = themeAssets.filter((asset) => asset.url && asset.meta?.enabled !== false);
  const topAsset = active.find((asset) => asset.kind === "papel" && asset.role === "top");
  const bodyAsset = active.find((asset) => asset.kind === "papel" && asset.role === "body");
  const plateAsset = active.find((asset) => asset.kind === "placa");
  const fontAsset = active.find((asset) => asset.kind === "fonte");
  const cliparts = active
    .filter((asset) => asset.kind === "clipart")
    .filter((asset, index, list) => list.findIndex((candidate) => candidate.url === asset.url) === index)
    .sort((a, b) => {
      const priority = (role) => role === "principal" ? 0 : role === "amigo" ? 1 : role === "amigo2" ? 2 : 3;
      return priority(a.role) - priority(b.role);
    });

  const [paperInfo, ...trimmedCliparts] = await Promise.all([
    bodyAsset ? cachedPaperInfo(bodyAsset.url) : null,
    ...cliparts.map(async (asset) => ({ asset, trimmed: await cachedTrim(asset.url) })),
  ]);
  const top = Boolean(topAsset);
  const body = Boolean(bodyAsset);
  const plate = Boolean(plateAsset);
  const characters = trimmedCliparts.map(({ asset, trimmed }, index) => ({
    ...trimmed,
    uri: auditDataUri(`${slug}-clipart-${index}`),
    name: asset.name,
    role: asset.role,
    usage: ["hero", "ornament", "border", "panel"].includes(asset.meta?.usage)
      ? asset.meta.usage
      : undefined,
  }));
  const palettes = paletteVariants(slug, defaultPalette(slug, fontAsset));

  for (const mold of molds) {
    for (const palette of palettes) {
      try {
        const svg = composer.montarSvgKit({
          moldName: mold.name,
          themeSlug: slug,
          moldSvg: mold.moldSvg,
          facesJson: mold.facesJson,
          maskUri: mold.maskUri,
          papelTopUri: top ? auditDataUri(`${slug}-paper-top`) : null,
          papelBodyUri: body ? auditDataUri(`${slug}-paper-body`) : null,
          papelBodyInfo: paperInfo,
          personagens: characters,
          placaUri: plate ? auditDataUri(`${slug}-plate`) : null,
          placaMeta: plateAsset?.meta ?? null,
          fonteFamily: fontAsset?.meta?.family || "sans-serif",
          fonteUri: null,
          corNome: palette.primary,
          corIdade: palette.secondary,
          corFundo: palette.background,
          corAcento: palette.accent,
          paletteAppearance: palette.appearance,
          nome: "Maria Eduarda",
          idade: "6",
        });
        const compactSvg = svg;
        compositions++;
        completedForTheme++;
        if (palette.id === "tema") {
          const report = curator.validateComposedKitSvg(compactSvg, {
            expectedName: "Maria Eduarda",
            expectedAge: "6",
            moldName: mold.name,
          });
          scores.push(report.score);
          if (!report.approved) {
            failures.push({
              theme: slug,
              mold: mold.name,
              palette: palette.id,
              score: report.score,
              issues: report.issues.map((issue) => issue.code),
              metrics: report.metrics,
            });
          }
        } else {
          const expectedMarker = palette.id === "vibrante"
            ? 'data-vibrant-color-wash="true"'
            : 'data-elegant-finish="true"';
          const signals = [
            `<metadata id="color-appearance">${palette.appearance}</metadata>`,
            '<metadata id="deterministic-quality-gate">kit-svg-r1</metadata>',
            'pattern id="papelTop"',
            'pattern id="papelBody"',
            expectedMarker,
            palette.primary,
            palette.secondary,
            palette.background,
            palette.accent,
          ];
          const missingSignals = signals.filter((signal) => !compactSvg.includes(signal));
          const externalImage = /<image\b[^>]*(?:href|xlink:href)="(?!data:image\/)/i.test(compactSvg);
          if (missingSignals.length || externalImage) {
            failures.push({
              theme: slug,
              mold: mold.name,
              palette: palette.id,
              issues: [
                ...(missingSignals.length ? ["color_variant_signals"] : []),
                ...(externalImage ? ["external_image"] : []),
              ],
              missingSignals,
            });
          }
        }
      } catch (error) {
        compositions++;
        completedForTheme++;
        failures.push({
          theme: slug,
          mold: mold.name,
          palette: palette.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
  } catch (error) {
    const missingCompositions = molds.length * 3 - completedForTheme;
    compositions += missingCompositions;
    failures.push({
      theme: slug,
      error: error instanceof Error ? error.message : String(error),
      missingCompositions,
    });
  } finally {
    persistMetricsCache();
    auditedThemes++;
    console.error(`auditados ${auditedThemes}/${byTheme.size}: ${slug}`);
  }
});

const failurePatterns = Object.entries(failures.reduce((patterns, failure) => {
  const key = failure.error || failure.issues?.join(",") || "unknown";
  patterns[key] = (patterns[key] || 0) + 1;
  return patterns;
}, {})).sort((a, b) => b[1] - a[1]);

const result = {
  ok: failures.length === 0,
  totals: {
    themes: byTheme.size,
    molds: molds.length,
    palettes: 3,
    compositions,
    fullSvgValidations: scores.length,
    colorVariantChecks: compositions - scores.length,
  },
  scores: scores.length ? {
    minimum: Math.min(...scores),
    maximum: Math.max(...scores),
    average: Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)),
  } : null,
  failureCount: failures.length,
  failurePatterns,
  failures: failures.slice(0, 200),
};

console.log(JSON.stringify(result, null, 2));
persistMetricsCache();
if (!result.ok) process.exitCode = 1;
