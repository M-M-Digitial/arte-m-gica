import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUTPUT = resolve(ROOT, "src/data/theme-palettes.generated.json");

function readEnv() {
  const values = {};
  for (const file of [".env", ".env.gerador", ".env.local"]) {
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
      const response = await fetch(url, options);
      if (response.ok || response.status < 500) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(350 * 2 ** (attempt - 1));
  }
  throw new Error(`Falha de rede: ${url}`, { cause: lastError });
}

async function rest(path) {
  const response = await fetchWithRetry(`${baseUrl}/rest/v1/${path}`, {
    headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}`, Range: "0-9999" },
  });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}

const clamp = (value, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value));

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const maximum = Math.max(r, g, b);
  const minimum = Math.min(r, g, b);
  const lightness = (maximum + minimum) / 2;
  const delta = maximum - minimum;
  if (delta === 0) return { h: 0, s: 0, l: lightness };
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue;
  if (maximum === r) hue = 60 * (((g - b) / delta) % 6);
  else if (maximum === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  return { h: (hue + 360) % 360, s: saturation, l: lightness };
}

function hslToRgb(hue, saturation, lightness) {
  const h = ((hue % 360) + 360) % 360;
  const s = clamp(saturation);
  const l = clamp(lightness);
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - chroma / 2;
  const sectors = h < 60 ? [chroma, x, 0]
    : h < 120 ? [x, chroma, 0]
      : h < 180 ? [0, chroma, x]
        : h < 240 ? [0, x, chroma]
          : h < 300 ? [x, 0, chroma]
            : [chroma, 0, x];
  return sectors.map((channel) => Math.round((channel + m) * 255));
}

const rgbToHex = (red, green, blue) => `#${[red, green, blue]
  .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0"))
  .join("")}`.toUpperCase();

const hslToHex = (hue, saturation, lightness) => rgbToHex(...hslToRgb(hue, saturation, lightness));

function parseHex(value) {
  if (!/^#[0-9a-f]{6}$/i.test(value ?? "")) return null;
  const hex = value.slice(1);
  const rgb = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return { rgb, ...rgbToHsl(...rgb) };
}

const hueDistance = (first, second) => {
  const distance = Math.abs(first - second) % 360;
  return Math.min(distance, 360 - distance) / 180;
};

async function extractColors(url, sourceWeight) {
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const image = await loadImage(Buffer.from(await response.arrayBuffer()));
  const scale = Math.min(1, 72 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height).data;
  const bins = new Map();
  let visible = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    if (pixels[index + 3] < 72) continue;
    visible++;
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];
    const key = `${red >> 4}-${green >> 4}-${blue >> 4}`;
    const bin = bins.get(key) ?? { red: 0, green: 0, blue: 0, count: 0 };
    bin.red += red;
    bin.green += green;
    bin.blue += blue;
    bin.count++;
    bins.set(key, bin);
  }
  return [...bins.values()]
    .filter((bin) => bin.count >= Math.max(2, visible * 0.004))
    .map((bin) => {
      const rgb = [bin.red, bin.green, bin.blue].map((channel) => channel / bin.count);
      return {
        hex: rgbToHex(...rgb),
        rgb,
        ...rgbToHsl(...rgb),
        weight: (bin.count / Math.max(1, visible)) * sourceWeight,
      };
    });
}

function derivedColor(color, hueOffset, saturation, lightness) {
  return {
    hex: hslToHex(color.h + hueOffset, saturation, lightness),
    h: (color.h + hueOffset + 360) % 360,
    s: saturation,
    l: lightness,
    weight: color.weight * 0.6,
  };
}

function choosePalette(candidates, paperCandidates, fontAsset) {
  const fontCandidates = [fontAsset?.meta?.cor, fontAsset?.meta?.cor2]
    .map(parseHex)
    .filter(Boolean)
    .map((color, index) => ({ ...color, hex: rgbToHex(...color.rgb), weight: index === 0 ? 1.8 : 1.45 }));
  const all = [...fontCandidates, ...candidates]
    .filter((color) => color.l > 0.035 && color.l < 0.965);
  const colorful = all.filter((color) => color.s >= 0.18 && color.l >= 0.14 && color.l <= 0.78);
  const primaryPool = colorful.length ? colorful : all;
  const primary = primaryPool.slice().sort((a, b) => {
    const score = (color) => color.weight * (0.72 + color.s * 1.35) * (1.25 - Math.abs(color.l - 0.44));
    return score(b) - score(a);
  })[0] ?? { hex: "#D93680", h: 334, s: 0.68, l: 0.53, weight: 1 };

  const distinctFromPrimary = all.filter((color) => hueDistance(color.h, primary.h) >= 0.13 || Math.abs(color.l - primary.l) >= 0.26);
  const secondary = distinctFromPrimary.slice().sort((a, b) => {
    const score = (color) => color.weight * (0.45 + color.s) * (0.70 + hueDistance(color.h, primary.h));
    return score(b) - score(a);
  })[0] ?? derivedColor(primary, 52, Math.max(0.62, primary.s), 0.55);

  const accentPool = all.filter((color) =>
    hueDistance(color.h, primary.h) >= 0.10
    && hueDistance(color.h, secondary.h) >= 0.08
  );
  const accent = accentPool.slice().sort((a, b) => {
    const score = (color) => color.weight * (0.5 + color.s)
      * (0.65 + hueDistance(color.h, primary.h) + hueDistance(color.h, secondary.h));
    return score(b) - score(a);
  })[0] ?? derivedColor(primary, 145, Math.max(0.52, primary.s * 0.9), 0.48);

  const backgrounds = paperCandidates.filter((color) => color.l >= 0.58);
  const backgroundSource = backgrounds.slice().sort((a, b) => b.weight * (0.8 + b.l) - a.weight * (0.8 + a.l))[0];
  const background = backgroundSource?.hex
    ?? hslToHex(primary.h, Math.min(0.48, primary.s * 0.55), 0.91);

  return {
    primary: primary.hex,
    secondary: secondary.hex,
    background,
    accent: accent.hex,
  };
}

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

const [assets, names] = await Promise.all([
  rest("tema_assets?select=theme_slug,kind,url,role,meta&order=theme_slug"),
  rest("modelos_prontos_temas?select=slug,name&order=name"),
]);
const bySlug = new Map();
for (const asset of assets) {
  const grouped = bySlug.get(asset.theme_slug) ?? [];
  grouped.push(asset);
  bySlug.set(asset.theme_slug, grouped);
}

let completed = 0;
const generated = await mapPool(names, 4, async (theme) => {
  const active = (bySlug.get(theme.slug) ?? []).filter((asset) => asset.url && asset.meta?.enabled !== false);
  const paper = active.find((asset) => asset.kind === "papel" && asset.role === "body")
    ?? active.find((asset) => asset.kind === "papel" && asset.role === "top");
  const heroes = active
    .filter((asset) => asset.kind === "clipart" && asset.meta?.usage === "hero")
    .filter((asset, index, list) => list.findIndex((candidate) => candidate.url === asset.url) === index)
    .slice(0, 4);
  const font = active.find((asset) => asset.kind === "fonte");
  if (!paper) throw new Error(`${theme.slug}: papel principal ausente.`);

  const [paperColors, ...heroColors] = await Promise.all([
    extractColors(paper.url, 1.15),
    ...heroes.map((hero) => extractColors(hero.url, 1.35)),
  ]);
  const palette = choosePalette([...paperColors, ...heroColors.flat()], paperColors, font);
  completed++;
  console.log(`${completed}/${names.length} ${theme.slug}`);
  return [theme.slug, palette];
});

const output = Object.fromEntries(generated.sort(([first], [second]) => first.localeCompare(second)));
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Paletas geradas: ${Object.keys(output).length} -> ${OUTPUT}`);
