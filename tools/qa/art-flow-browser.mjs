// Local regression test. All auth, generation and write requests are intercepted.
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { buildArtLayout } from "../../supabase/functions/_shared/art-layout.ts";

const host = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const api = async (path) => {
  const res = await fetch(`${host}/rest/v1/${path}`, { headers: { apikey: key } });
  if (!res.ok) throw new Error(`Catalog fixture HTTP ${res.status}`);
  return res.json();
};
const [mold] = (await api("moldes?select=*&name=ilike.*milk*")).filter((m) => /^(caixa|caixinha) milk$/i.test(m.name));
const [theme] = await api("temas?select=*&name=eq.Frozen");
assert(mold && theme);
const faces = await (await fetch(mold.faces_url)).json();
const plan = { layout: buildArtLayout({ width: faces.W, height: faces.H, faces: faces.faces }, mold.name) };
const template = Buffer.from(await (await fetch(mold.template_png_url)).arrayBuffer());
const base = template;
const uid = "11111111-1111-4111-8111-111111111111";
const user = { id: uid, email: "qa-local@example.invalid", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
const session = { access_token: "qa-local-only", refresh_token: "qa-local-only", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
const browser = await chromium.launch({ headless: true, channel: "chrome" });
await mkdir("output/art-upgrade", { recursive: true });
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let generationCount = 0, mockupCount = 0;
    let capturedBody;
    const storage = new Map();
    const history = [];
    await context.addInitScript(({ session, storageKey }) => localStorage.setItem(storageKey, JSON.stringify(session)), { session, storageKey: `sb-${new URL(host).hostname.split('.')[0]}-auth-token` });
    await page.route(`${host}/**`, async (route) => {
      const request = route.request(), url = new URL(request.url()), path = url.pathname;
      const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
      if (path.startsWith("/auth/")) return json(user);
      if (path.includes("/functions/")) {
        const body = request.postDataJSON();
        if (path.endsWith("gerar-mockup")) { mockupCount++; return json({ error: "Unexpected mockup" }); }
        if (body.action !== "status") { generationCount++; capturedBody = body; return json({ jobId: "resp_local_regression" }); }
        return json({ status: "done", imageBase64: `data:image/png;base64,${base.toString("base64")}`, artLayout: plan.layout });
      }
      if (path.startsWith("/rest/")) {
        const table = path.split("/").at(-1);
        if (table === "moldes") return json(request.headers().accept?.includes("object") ? mold : [mold]);
        if (table === "temas") return json([theme]);
        if (table === "assinaturas") return json({ email: user.email, status: "active", valid_until: null });
        if (table === "user_roles") return json([{ role: "admin" }]);
        if (table === "app_config") return json(null);
        if (table === "minhas_artes") {
          if (request.method() === "POST") {
            const row = { ...request.postDataJSON(), id: String(history.length + 1), created_at: new Date().toISOString() };
            history.unshift(row); return json(row, 201);
          }
          return json(history);
        }
        return json([]);
      }
      if (path.includes("/storage/v1/object/")) {
        const objectPath = path.replace("/storage/v1/object/", "").replace(/^public\//, "");
        if (request.method() === "POST") { storage.set(objectPath, request.postDataBuffer()); return json({ Key: objectPath }); }
        if (storage.has(objectPath)) return route.fulfill({ body: storage.get(objectPath), contentType: objectPath.endsWith(".json") ? "application/json" : objectPath.endsWith(".svg") ? "image/svg+xml" : "image/png" });
        return route.continue();
      }
      return route.abort();
    });
    await page.goto("http://127.0.0.1:5187/criar");
    await page.getByRole("heading", { name: "Qual o tema da festa?" }).waitFor();
    await page.screenshot({ path: `output/art-upgrade/start-${viewport.width}.png`, fullPage: true });
    await page.getByRole("button", { name: /Frozen/ }).click();
    await page.getByRole("button", { name: /Caixa Milk/ }).click();
    await page.getByPlaceholder("Ex: Maria Clara").fill("Maria Eduarda Santos");
    await page.getByPlaceholder("5", { exact: true }).fill("3");
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: /Cartoon/ }).click();
    await page.getByRole("button", { name: /Divertida/ }).click();
    await page.getByRole("button", { name: /Maximalista/ }).click();
    await page.getByLabel("Bem colorida").check();
    await page.getByLabel("Acabamento", { exact: true }).selectOption("camadas");
    await page.getByLabel("Detalhes desejados").fill("Cristais e neve, personagens grandes e nome bem legivel.");
    await page.screenshot({ path: `output/art-upgrade/brief-${viewport.width}.png`, fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await page.getByRole("button", { name: /Automática/ }).click();
    await page.getByRole("button", { name: "Sem frase", exact: true }).click();
    await page.getByRole("button", { name: "Gerar arte com IA" }).click();
    await page.getByRole("heading", { name: "Sua arte final" }).waitFor({ timeout: 60000 });
    assert.equal(generationCount, 1);
    assert.equal(mockupCount, 0);
    assert.equal(capturedBody.creativeBrief.colorMood, "vibrante");
    assert.equal(capturedBody.densidadeVisual, "maximalista");
    await page.screenshot({ path: `output/art-upgrade/result-${viewport.width}.png`, fullPage: true });
    const downloadWait = page.waitForEvent("download");
    await page.getByRole("button", { name: "Baixar SVG importável" }).click();
    const download = await downloadWait;
    const svg = await readFile(await download.path(), "utf8");
    assert(svg.includes('id="personalizacao-editavel"'));
    assert(svg.includes("Maria")); assert(svg.includes("Eduarda")); assert(svg.includes("Santos"));
    assert(!svg.includes("foreignObject")); assert(!svg.includes("<html"));
    await writeFile(`output/art-upgrade/final-${viewport.width}.svg`, svg);
    await page.getByRole("button", { name: "Editar nome, idade ou fonte" }).click();
    await page.getByPlaceholder("Ex: Maria Clara").fill("João & Sofia");
    await page.getByRole("button", { name: "Revisar e gerar" }).click();
    await page.getByRole("button", { name: "Gerar arte com IA" }).click();
    await page.getByRole("heading", { name: "Sua arte final" }).waitFor({ timeout: 60000 });
    assert.equal(generationCount, 1, "Renaming must not call image generation");
    // A new page represents a fresh session, with the saved recipe loaded from history.
    await page.goto("http://127.0.0.1:5187/minhas-artes");
    await page.getByRole("button", { name: "Refazer com outro nome" }).first().click();
    await page.getByPlaceholder("Ex: Maria Clara").fill("Ana Clara");
    await page.getByRole("button", { name: "Revisar e gerar" }).click();
    await page.getByRole("button", { name: "Gerar arte com IA" }).click();
    await page.getByRole("heading", { name: "Sua arte final" }).waitFor({ timeout: 60000 });
    assert.equal(generationCount, 1, "History reuse must not call image generation");
    assert.deepEqual(errors, []);
    results.push({ viewport, generationCount, mockupCount, historyCount: history.length, errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile("output/art-upgrade/browser-results.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
