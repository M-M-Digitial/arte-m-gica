// Prévia do Compositor fora do navegador: busca os assets reais de um tema,
// injeta o mesmo montarSvgKit do app (bundle via esbuild) e renderiza PNG
// com resvg. Uso:
//   node tools/ingestao/preview-kit.mjs <theme_slug> <molde_name> <saida.png> [nome] [idade] [paleta]
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { Resvg } from "@resvg/resvg-js";

const [slug, moldeName, outPath, nome = "Valentina", idade = "4", paletaId = "tema"] = process.argv.slice(2);
const palettes = {
  vibrante: { primary: "#D93680", secondary: "#F2A900", background: "#FFF2D5", accent: "#159A9C" },
  pastel: { primary: "#B85C8A", secondary: "#79BFAF", background: "#FFF5F8", accent: "#E7B84B" },
  aventura: { primary: "#245F4F", secondary: "#E4A82B", background: "#E9F5EA", accent: "#C9533F" },
  magica: { primary: "#4D62A8", secondary: "#D77DA5", background: "#ECF3FF", accent: "#E7B93F" },
};
let palette = palettes[paletaId];
if (!slug || !moldeName || !outPath) {
  console.error("uso: node preview-kit.mjs <theme_slug> <molde_name> <saida.png> [nome] [idade]");
  process.exit(1);
}

const URL_ = "https://qdwhwxboocplmnmczkfj.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkd2h3eGJvb2NwbG1ubWN6a2ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzODI4ODAsImV4cCI6MjA5ODk1ODg4MH0.zqv3lE9-Bq7gW7RAK41EjdOt8YfUtSODpF-Iuey_o4o";
const rest = async (q) => {
  const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
  if (!r.ok) throw new Error(`${q}: ${r.status}`);
  return r.json();
};

// bundle do módulo puro do app (montarSvgKit) — mesma fonte da verdade do navegador
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "..", "..");
const bundle = path.join(here, ".compose-kit-bundle.mjs");
execSync(`npx esbuild "${path.join(repo, "src/lib/compose-kit.ts")}" --bundle --format=esm --outfile="${bundle}" --platform=neutral`, { stdio: "pipe" });
const mod = await import(pathToFileURL(bundle).href + `?v=${Math.random()}`);
if (!mod.montarSvgKit) throw new Error("montarSvgKit não exportado — o compose-kit.ts precisa expor o layout puro");
if (!palette && paletaId === "tema") palette = mod.getDefaultThemePalette?.(slug);

const fetchBuf = async (u) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`${u}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};
const toDataUri = (buf, mime = "image/png") => `data:${mime};base64,${buf.toString("base64")}`;

// recorte de transparência idêntico ao do navegador
async function trim(buf) {
  const img = await loadImage(buf);
  const cv = createCanvas(img.width, img.height);
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  const bounds = mod.findVisibleBounds(d, cv.width, cv.height);
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return { uri: toDataUri(buf), w: img.width, h: img.height, visibleCoverage: 0 };
  }
  let { minX, minY, maxX, maxY } = bounds;
  let visiblePixels = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 24) visiblePixels++;
    }
  }
  const visibleCoverage = visiblePixels / ((maxX - minX + 1) * (maxY - minY + 1));
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(cv.width - 1, maxX + pad); maxY = Math.min(cv.height - 1, maxY + pad);
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const out = createCanvas(w, h);
  out.getContext("2d").drawImage(cv, minX, minY, w, h, 0, 0, w, h);
  return { uri: toDataUri(out.toBuffer("image/png")), w, h, visibleCoverage };
}

const [molde] = await rest(`moldes?select=*&name=eq.${encodeURIComponent(moldeName)}`);
if (!molde?.svg_url) throw new Error(`molde "${moldeName}" não encontrado/sem svg`);
const assets = await rest(`tema_assets?select=kind,name,url,role,meta&theme_slug=eq.${encodeURIComponent(slug)}`);
if (!assets.length) throw new Error(`tema "${slug}" sem assets`);

const byRole = (role) => assets.find((a) => a.role === role);
const fonte = assets.find((a) => a.kind === "fonte");
const placa = assets.find((a) => a.kind === "placa");
const rolePriority = (role) => role === "principal" ? 0 : role === "amigo" ? 1 : role === "amigo2" ? 2 : 3;
const cliparts = assets
  .filter((asset) => asset.kind === "clipart" && asset.url && asset.meta?.enabled !== false)
  .filter((asset, index, list) => list.findIndex((candidate) => candidate.url === asset.url) === index)
  .sort((a, b) => rolePriority(a.role) - rolePriority(b.role));

const [moldSvg, facesJson, maskBuf] = await Promise.all([
  fetch(molde.svg_url).then((r) => r.text()),
  fetch(molde.faces_url).then((r) => r.text()),
  fetchBuf(molde.mask_url),
]);
const get = async (a, doTrim = false) => {
  if (!a) return null;
  const buf = await fetchBuf(a.url);
  if (doTrim) return trim(buf);
  return { uri: toDataUri(buf), w: 0, h: 0 };
};
const [top, body, personagens, placaImg, fonteBin] = await Promise.all([
  get(byRole("top")), get(byRole("body")),
  Promise.all(cliparts.map((clipart) => get(clipart, true))),
  get(placa), fonte ? fetchBuf(fonte.url) : null,
]);

// mesma análise de densidade do navegador (compose-kit.analisarPapel)
async function analisarPapel(uri) {
  const img = await loadImage(Buffer.from(uri.split(",")[1], "base64"));
  const cv = createCanvas(32, 32);
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0, 32, 32);
  const d = cx.getImageData(0, 0, 32, 32).data;
  let sr = 0, sg = 0, sb = 0;
  const lums = [];
  for (let i = 0; i < 1024; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    sr += r; sg += g; sb += b;
    lums.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const media = lums.reduce((a, b) => a + b, 0) / lums.length;
  const desvio = Math.sqrt(lums.reduce((a, l) => a + (l - media) ** 2, 0) / lums.length);
  const hex = (v) => Math.round(v / 1024).toString(16).padStart(2, "0");
  return { busy: desvio > 26, corMedia: `#${hex(sr)}${hex(sg)}${hex(sb)}` };
}
const bodyInfo = body ? await analisarPapel(body.uri) : null;
if (bodyInfo) console.log(`papel body: ${bodyInfo.busy ? "estampa DENSA (vira destaque)" : "calmo (cobre o corpo)"} | cor média ${bodyInfo.corMedia}`);

const svg = mod.montarSvgKit({
  moldName: moldeName,
  moldSvg, facesJson,
  maskUri: toDataUri(maskBuf),
  papelTopUri: top?.uri ?? null,
  papelBodyUri: body?.uri ?? null,
  papelBodyInfo: bodyInfo,
  personagens: personagens.map((trimmed, index) => {
    const asset = cliparts[index];
    const usage = asset?.meta?.usage;
    return {
      ...trimmed,
      name: asset?.name,
      role: asset?.role,
      usage: ["hero", "ornament", "border", "panel"].includes(usage) ? usage : undefined,
    };
  }),
  placaUri: placaImg?.uri ?? null,
  placaMeta: placa?.meta ?? null,
  fonteFamily: fonte?.meta?.family || "sans-serif",
  fonteUri: null, // resvg usa fontFiles; o data-uri fica só no navegador
  corNome: palette?.primary || fonte?.meta?.cor || "#7A2FB0",
  corIdade: palette?.secondary || fonte?.meta?.cor2 || "#1BA67C",
  corFundo: palette?.background,
  corAcento: palette?.accent,
  nome, idade,
});

const fontFiles = [];
if (fonteBin) {
  const fp = path.join(here, `.fonte-${slug}.ttf`);
  fs.writeFileSync(fp, fonteBin);
  fontFiles.push(fp);
}
const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1600 }, font: { fontFiles, loadSystemFonts: true, defaultFontFamily: fonte?.meta?.family || "sans-serif" } });
fs.writeFileSync(outPath, resvg.render().asPng());
console.log(`OK ${slug} + ${moldeName} -> ${outPath} (svg ${(svg.length / 1048576).toFixed(1)}MB)`);
