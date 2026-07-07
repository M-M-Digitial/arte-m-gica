import fs from "node:fs";
import path from "node:path";

// Sobe os artefatos de composição pro Storage (keys slugificadas) e gera o SQL
// de registro (updates.sql). Service key SÓ via stdin — nunca toca o disco.
const TMP = "C:/Users/marco/AppData/Local/Temp/claude/C--Users-marco-Code/556a1e5e-6a5f-4d66-bf5f-e8638883147c/scratchpad";
const URL = "https://qdwhwxboocplmnmczkfj.supabase.co";
const BUCKET = "moldes";
const PUB = `${URL}/storage/v1/object/public/${BUCKET}`;

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;
const SERVICE = (JSON.parse(stdin).find((k) => k.name === "service_role") || {}).api_key;
if (!SERVICE) { console.error("service_role não encontrada"); process.exit(1); }

const put = async (storagePath, filePath, contentType) => {
  const body = fs.readFileSync(filePath);
  const res = await fetch(`${URL}/storage/v1/object/${BUCKET}/${storagePath}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE}`, "Content-Type": contentType, "x-upsert": "true" },
    body,
  });
  if (!res.ok) throw new Error(`${storagePath}: ${res.status} ${await res.text()}`);
  return body.length;
};

let total = 0, bytes = 0;
const up = async (sp, fp, ct) => { bytes += await put(sp, fp, ct); total++; };

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const sqlLines = [];

// 1) moldes: SVG + máscara + faces
const svgs = fs.readdirSync(`${TMP}/moldes_svg`).filter((f) => f.endsWith(".svg"));
const existing = new Set(["Caixa Milk","Caixa Milk Vintage","Caixa Cubo","Caixa Bala","Caixa Meia Bala","Caixa Brownie","Caixa Canudo","Caixa Fina","Caixa Mala","Caixa Pipoca","Caixa Porta Tubetes","Caixa Saquinho","Caixa Sextava Gomos","Caixa Sushi","China In Box","Cestinha","Forminhas","Porta Bis Duplo"]);
for (const f of svgs) {
  const base = path.basename(f, ".svg");
  const s = slug(base);
  await up(`svg/${s}.svg`, `${TMP}/moldes_svg/${f}`, "image/svg+xml");
  await up(`mask/${s}.png`, `${TMP}/estudo_sereia/mask_${base}.png`, "image/png");
  await up(`faces/${s}.json`, `${TMP}/estudo_sereia/faces_${base}.json`, "application/json");
  console.log("ok molde", s);
  const dbName = base.replace(/\s+-\s+/g, " "); // "Caixa Sextava - Gomos" -> "Caixa Sextava Gomos"
  const urls = `svg_url=${q(`${PUB}/svg/${s}.svg`)}, mask_url=${q(`${PUB}/mask/${s}.png`)}, faces_url=${q(`${PUB}/faces/${s}.json`)}`;
  if (existing.has(dbName)) {
    sqlLines.push(`UPDATE public.moldes SET ${urls} WHERE name = ${q(dbName)};`);
  } else {
    sqlLines.push(`INSERT INTO public.moldes (name, category, emoji, popular, sort_order, svg_url, mask_url, faces_url) VALUES (${q(dbName)}, 'Caixas', '📦', false, 50, ${q(`${PUB}/svg/${s}.svg`)}, ${q(`${PUB}/mask/${s}.png`)}, ${q(`${PUB}/faces/${s}.json`)});`);
  }
}

// 2) tema A Pequena Sereia
const T = "a-pequena-sereia";
const assets = [
  ["escamas.png", "papel", "top", {}],
  ["escamas_wide.png", "papel", "top-alt", {}],
  ["ariel.png", "clipart", "principal", { w: 830, h: 698 }],
  ["linguado.png", "clipart", "amigo", { w: 706, h: 634 }],
  ["sebastiao.png", "clipart", "amigo2", { w: 421, h: 530 }],
  ["placa.png", "placa", "placa", { w: 320, h: 202 }],
];
for (const [f, kind, role, meta] of assets) {
  await up(`temas/${T}/${f}`, `${TMP}/estudo_sereia/proc/${f}`, "image/png");
  sqlLines.push(`INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta) VALUES (${q(T)}, ${q(kind)}, ${q(f)}, ${q(`${PUB}/temas/${T}/${f}`)}, ${q(role)}, ${q(JSON.stringify(meta))}::jsonb) ON CONFLICT (theme_slug, kind, name) DO UPDATE SET url = EXCLUDED.url, role = EXCLUDED.role, meta = EXCLUDED.meta;`);
}
await up(`temas/${T}/fonte.ttf`, `${TMP}/alice_sereia/fonte.ttf`, "font/ttf");
sqlLines.push(`INSERT INTO public.tema_assets (theme_slug, kind, name, url, role, meta) VALUES (${q(T)}, 'fonte', 'fonte.ttf', ${q(`${PUB}/temas/${T}/fonte.ttf`)}, 'fonte', '{"family":"Amarillo"}'::jsonb) ON CONFLICT (theme_slug, kind, name) DO UPDATE SET url = EXCLUDED.url, meta = EXCLUDED.meta;`);
console.log("ok tema", T);

fs.writeFileSync(`${TMP}/updates.sql`, sqlLines.join("\n"));
console.log(`TOTAL: ${total} arquivos, ${(bytes / 1024 / 1024).toFixed(1)} MB | updates.sql: ${sqlLines.length} stmts`);
