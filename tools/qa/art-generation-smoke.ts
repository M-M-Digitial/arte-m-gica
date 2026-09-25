// Paid, opt-in integration check. Never run as part of the unit test suite.
// deno run --env-file=.env --env-file=.env.local --allow-env --allow-net --allow-read --allow-write=output/art-upgrade tools/qa/art-generation-smoke.ts --generate minimalista
import { normalizeCreativeBrief } from "../../supabase/functions/_shared/art-direction.ts";
import { buildArtLayout } from "../../supabase/functions/_shared/art-layout.ts";
import { ART_EDITOR_INSTRUCTIONS, buildArtGenerationPrompt } from "../../supabase/functions/_shared/art-prompt.ts";
import { buildEditMaskFromInteriorMask, compositeMoldLines } from "../../supabase/functions/_shared/mold-image.ts";
import { imageModelFor, imageOutputSize, IMAGE_MODELS } from "../../supabase/functions/_shared/image-models.ts";
import { bytesToBase64 } from "../../supabase/functions/_shared/image-bytes.ts";
import { reviewGeneratedArt } from "../../supabase/functions/_shared/art-curator.ts";

if (!Deno.args.includes("--generate")) throw new Error("Use --generate para autorizar UMA geracao paga.");
const variant = Deno.args.includes("minimalista") ? "minimalista" : "decorado";
const themeSlug = Deno.args.includes("--safari") ? "safari" : "frozen";
const themeName = themeSlug === "frozen" ? "Frozen" : "Safari";
const prefix = `${themeSlug}-${variant}`;
const out = "output/art-upgrade";
await Deno.mkdir(out, { recursive: true });
const apiKey = Deno.env.get("OPENAI_API_KEY");
const url = Deno.env.get("VITE_SUPABASE_URL")!;
const anon = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
if (!apiKey || !url || !anon) throw new Error("Configuracao local incompleta.");
const query = async (path: string) => {
  const res = await fetch(url + "/rest/v1/" + path, { headers: { apikey: anon } });
  if (!res.ok) throw new Error(`Catalogo: HTTP ${res.status}`);
  return res.json();
};
const molds = await query("moldes?select=name,template_png_url,mask_url,faces_url,svg_url&name=ilike.*milk*");
const mold = molds.find((m: { name: string }) => /^(caixa|caixinha) milk$/i.test(m.name)) ?? molds[0];
if (!mold) throw new Error("Molde milk ausente.");
const assets = await query(`tema_assets?select=kind,role,url&theme_slug=eq.${themeSlug}`);
if (!assets.length) throw new Error(`Tema sem referencias: ${themeSlug}`);
const refs = [];
for (const asset of assets.filter((a: { kind: string }) => ["papel", "clipart"].includes(a.kind)).slice(0, 6)) {
  const response = await fetch(asset.url);
  if (!response.ok) throw new Error(`Referencia indisponivel: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  refs.push({ ...asset, dataUrl: `data:image/png;base64,${bytesToBase64(bytes)}` });
}
const template = new Uint8Array(await (await fetch(mold.template_png_url)).arrayBuffer());
const interior = new Uint8Array(await (await fetch(mold.mask_url)).arrayBuffer());
const faces = await (await fetch(mold.faces_url)).json();
const layout = buildArtLayout({ width: faces.W, height: faces.H, faces: faces.faces }, mold.name);
const brief = normalizeCreativeBrief({ density: variant, colorMood: variant === "minimalista" ? "elegante" : "vibrante", drawing: "cartoon", finish: variant === "minimalista" ? "limpo" : "camadas", audience: "infantil" });
const prompt = buildArtGenerationPrompt({
  moldeName: mold.name, temaNome: themeName, themeStoryDirection: themeSlug === "frozen" ? "Reino de gelo, neve, cristais e as personagens das referencias." : "Savana festiva infantil com animais baby, acacias, ceu azul e folhagem.",
  colorsDesc: themeSlug === "frozen" ? "Azul gelo, azul profundo, rosa e lilas coordenados; acento magenta controlado." : "Verde folhagem, amarelo vivo, coral e azul ceu coordenados.", brief, editable: true, artLayout: layout,
});
const mask = await buildEditMaskFromInteriorMask(interior, template);
if (!mask) throw new Error("Mascara invalida.");
const payload = {
  model: IMAGE_MODELS.curator, background: true, store: true,
  instructions: ART_EDITOR_INSTRUCTIONS,
  input: [{ role: "user", content: [
    { type: "input_text", text: prompt },
    { type: "input_image", image_url: `data:image/png;base64,${bytesToBase64(template)}`, detail: "high" },
    ...refs.flatMap((ref) => [{ type: "input_text", text: `Componente Alice: ${ref.kind}, ${ref.role}` }, { type: "input_image", image_url: ref.dataUrl, detail: "high" }]),
  ] }],
  tools: [{ type: "image_generation", action: "edit", model: imageModelFor("high"), quality: "high", size: imageOutputSize(faces.W, faces.H, "high"), input_image_mask: { image_url: `data:image/png;base64,${bytesToBase64(mask)}` } }],
  tool_choice: { type: "image_generation" },
};
const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
const create = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers, body: JSON.stringify(payload) });
if (!create.ok) throw new Error(`OpenAI ${create.status}: ${await create.text()}`);
let job = await create.json();
await Deno.writeTextFile(`${out}/${prefix}-job.json`, JSON.stringify({ id: job.id, brief, layout, mold, prompt }, null, 2));
console.log(`Geracao iniciada: ${variant}, ${imageModelFor("high")}, ${payload.tools[0].size}`);
const deadline = Date.now() + 12 * 60_000;
while (["queued", "in_progress"].includes(job.status)) {
  if (Date.now() > deadline) throw new Error("Tempo excedido; job salvo para consulta, nao iniciar outra geracao.");
  await new Promise((resolve) => setTimeout(resolve, 8000));
  const response = await fetch(`https://api.openai.com/v1/responses/${job.id}`, { headers });
  if (!response.ok) throw new Error(`Consulta HTTP ${response.status}; job salvo.`);
  job = await response.json();
}
const call = job.output?.find((o: { type: string }) => o.type === "image_generation_call");
if (!call?.result) {
  await Deno.writeTextFile(`${out}/${prefix}-failure.json`, JSON.stringify(job, null, 2));
  throw new Error(`Sem imagem: ${JSON.stringify(job.error ?? job.incomplete_details)}; diagnostico salvo.`);
}
const raw = Uint8Array.from(atob(call.result), (c) => c.charCodeAt(0));
const image = await compositeMoldLines(template, raw);
await Deno.writeFile(`${out}/${prefix}-base.png`, image);
const review = await reviewGeneratedArt(image, template, { moldeName: mold.name, temaNome: themeName, nome: "", idade: "", brief, artLayout: layout }, apiKey, refs);
await Deno.writeTextFile(`${out}/${prefix}-review.json`, JSON.stringify({ review, usage: job.usage, imageUsage: call.usage }, null, 2));
console.log(JSON.stringify({ variant, file: `${out}/${prefix}-base.png`, review }));
