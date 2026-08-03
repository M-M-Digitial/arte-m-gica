import fs from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import * as fontkit from "fontkit";

// Pipeline de ingestão de tema da biblioteca Alice:
//   node ingest-theme.mjs <slug> <fonteFolderId> <papelFolderId>   (service key via stdin)
// Baixa fonte + papéis/cliparts, classifica (transparência => clipart), processa,
// sobe pro Storage e emite updates_<slug>.sql para registrar no banco.
const TMP = "C:/Users/marco/AppData/Local/Temp/claude/C--Users-marco-Code/556a1e5e-6a5f-4d66-bf5f-e8638883147c/scratchpad";
const URL_ = "https://qdwhwxboocplmnmczkfj.supabase.co";
const BUCKET = "moldes";
const PUB = `${URL_}/storage/v1/object/public/${BUCKET}`;

const [slug, fonteFolderId, papelFolderId] = process.argv.slice(2);
if (!slug || !fonteFolderId || !papelFolderId) { console.error("uso: ingest-theme.mjs <slug> <fonteId> <papelId>"); process.exit(1); }

let stdin = "";
for await (const c of process.stdin) stdin += c;
const SERVICE = (JSON.parse(stdin).find((k) => k.name === "service_role") || {}).api_key;
if (!SERVICE) { console.error("service_role ausente"); process.exit(1); }

const listFolder = async (id) => {
  const html = await (await fetch(`https://drive.google.com/drive/folders/${id}`)).text();
  const re = /"([A-Za-z0-9_-]{20,44})"\],null,null,null,"([a-zA-Z0-9.+/-]+)"/g;
  const seen = new Set(); const out = []; let m;
  while ((m = re.exec(html))) { if (!seen.has(m[1])) { seen.add(m[1]); out.push({ id: m[1], mime: m[2] }); } }
  return out;
};
const download = async (id) => {
  const r = await fetch(`https://drive.google.com/uc?export=download&id=${id}`, { redirect: "follow" });
  if (!r.ok) throw new Error(`download ${id}: ${r.status}`);
  return Buffer.from(await r.arrayBuffer());
};
const put = async (sp, body, ct) => {
  const res = await fetch(`${URL_}/storage/v1/object/${BUCKET}/${sp}`, {
    method: "POST", headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": ct, "x-upsert": "true" }, body,
  });
  if (!res.ok) throw new Error(`${sp}: ${res.status} ${await res.text()}`);
};
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sql = [];
const dir = `${TMP}/temas/${slug}`;
fs.mkdirSync(dir, { recursive: true });

// ---- 1) fonte ----
const fonts = (await listFolder(fonteFolderId)).filter((f) => /font|ttf|otf/i.test(f.mime));
let family = "sans-serif";
if (fonts.length) {
  const buf = await download(fonts[0].id);
  fs.writeFileSync(`${dir}/fonte.ttf`, buf);
  try { family = fontkit.create(buf).familyName || family; } catch {}
  await put(`temas/${slug}/fonte.ttf`, buf, "font/ttf");
  console.log(`fonte: ${family}`);
}

// ---- 2) papéis/cliparts ----
const imgs = (await listFolder(papelFolderId)).filter((f) => f.mime.startsWith("image/"));
console.log(`${imgs.length} imagens no Papel Digital`);
const papers = []; const cliparts = [];
for (const it of imgs) {
  try {
    const raw = await download(it.id);
    const img = await loadImage(raw);
    const cv = createCanvas(img.width, img.height);
    const cx = cv.getContext("2d");
    cx.drawImage(img, 0, 0);
    const d = cx.getImageData(0, 0, cv.width, cv.height).data;
    let transparent = 0;
    const step = Math.max(4, Math.floor(d.length / 4 / 20000) * 4);
    let samples = 0;
    for (let i = 3; i < d.length; i += step) { samples++; if (d[i] < 40) transparent++; }
    const frac = transparent / samples;
    const isClipart = frac > 0.03;
    const png = cv.toBuffer("image/png");
    (isClipart ? cliparts : papers).push({ id: it.id, png, w: img.width, h: img.height, area: img.width * img.height, alpha: frac });
  } catch (e) { console.warn("pulei", it.id, String(e).slice(0, 80)); }
}
papers.sort((a, b) => b.area - a.area);
cliparts.sort((a, b) => b.area - a.area);
console.log(`classificados: ${papers.length} papéis, ${cliparts.length} cliparts`);

// cores dominantes do papel 'top' p/ o texto do nome
let cor = "#7A2FB0", cor2 = "#1BA67C";
if (papers.length) {
  const img = await loadImage(papers[0].png);
  const cv = createCanvas(64, 64); const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0, 64, 64);
  const d = cx.getImageData(0, 0, 64, 64).data;
  let best = null, best2 = null;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx - mn, lum = (mx + mn) / 2;
    if (lum < 40 || lum > 215) continue;
    const score = sat;
    if (!best || score > best.score) { best2 = best; best = { r, g, b, score }; }
  }
  const hex = (c) => "#" + [c.r, c.g, c.b].map((v) => v.toString(16).padStart(2, "0")).join("");
  if (best) cor = hex(best);
  if (best2) cor2 = hex(best2);
}

// ---- 3) sobe e registra: papéis top/body + até 3 cliparts ----
const roles = ["top", "body"];
for (let i = 0; i < Math.min(papers.length, 2); i++) {
  const name = `papel-${roles[i]}.png`;
  await put(`temas/${slug}/${name}`, papers[i].png, "image/png");
  sql.push(`INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta) VALUES (${q(slug)}, 'papel', ${q(name)}, ${q(`${PUB}/temas/${slug}/${name}`)}, ${q(roles[i])}, '{}'::jsonb) ON CONFLICT (theme_slug, kind, name) DO UPDATE SET url=EXCLUDED.url, role=EXCLUDED.role;`);
  console.log("papel", roles[i]);
}
const croles = ["principal", "amigo", "amigo2"];
for (let i = 0; i < Math.min(cliparts.length, 8); i++) {
  const c = cliparts[i];
  const role = croles[i] ?? `variacao-${i + 1}`;
  const name = `clipart-${role}.png`;
  await put(`temas/${slug}/${name}`, c.png, "image/png");
  sql.push(`INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta) VALUES (${q(slug)}, 'clipart', ${q(name)}, ${q(`${PUB}/temas/${slug}/${name}`)}, ${q(role)}, ${q(JSON.stringify({ w: c.w, h: c.h }))}::jsonb) ON CONFLICT (theme_slug, kind, name) DO UPDATE SET url=EXCLUDED.url, role=EXCLUDED.role, meta=EXCLUDED.meta;`);
  console.log("clipart", role, `${c.w}x${c.h} alpha=${c.alpha.toFixed(2)}`);
}
if (fonts.length) {
  sql.push(`INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta) VALUES (${q(slug)}, 'fonte', 'fonte.ttf', ${q(`${PUB}/temas/${slug}/fonte.ttf`)}, 'fonte', ${q(JSON.stringify({ family, cor, cor2 }))}::jsonb) ON CONFLICT (theme_slug, kind, name) DO UPDATE SET url=EXCLUDED.url, meta=EXCLUDED.meta;`);
}

fs.writeFileSync(`${TMP}/updates_${slug}.sql`, sql.join("\n"));
console.log(`FEITO: updates_${slug}.sql (${sql.length} stmts) | cores ${cor}/${cor2}`);
