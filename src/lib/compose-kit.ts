// Motor de composição "padrão Alice" — roda 100% no navegador.
// Monta um SVG editável: molde vetorial + papéis/cliparts do tema + nome como <text>.
// Zonas: abas topo = papel "top" | corpo = papel "body" ou cena aquática | abaixo = branco.

export interface MoldeCompose {
  name: string;
  svg_url: string;
  mask_url: string;
  faces_url: string;
}

export interface TemaAsset {
  kind: "papel" | "clipart" | "fonte" | "placa";
  name: string;
  url: string;
  role: string | null;
  meta: Record<string, any>;
}

export interface ComposeInput {
  molde: MoldeCompose;
  assets: TemaAsset[];
  nome: string;
  idade?: string;
}

interface Face { x: number; y: number; w: number; h: number; area: number; cx: number; cy: number }

const fetchText = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  return r.text();
};

const fetchDataUri = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`);
  const blob = await r.blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
};

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Recorta as margens transparentes do clipart (a biblioteca tem PNGs quadrados
// com o desenho pequeno no meio — sem o crop o personagem sai miúdo na arte).
async function trimTransparent(dataUri: string): Promise<{ uri: string; w: number; h: number }> {
  const img = new Image();
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error("img")); img.src = dataUri; });
  const cv = document.createElement("canvas");
  cv.width = img.width; cv.height = img.height;
  const cx = cv.getContext("2d")!;
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, minY = cv.height, maxX = -1, maxY = -1;
  for (let y = 0; y < cv.height; y++) {
    for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 12) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || (maxX - minX) < 10) return { uri: dataUri, w: img.width, h: img.height };
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(cv.width - 1, maxX + pad); maxY = Math.min(cv.height - 1, maxY + pad);
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  out.getContext("2d")!.drawImage(cv, minX, minY, w, h, 0, 0, w, h);
  return { uri: out.toDataURL("image/png"), w, h };
}

/** Compõe o kit e devolve o SVG completo (auto-contido, com assets embutidos). */
export async function composeKit({ molde, assets, nome, idade }: ComposeInput): Promise<string> {
  const byRole = (role: string) => assets.find((a) => a.role === role);
  const fonte = assets.find((a) => a.kind === "fonte");
  const placa = assets.find((a) => a.kind === "placa");
  const papelTop = byRole("top");
  const papelBody = byRole("body");
  const principal = byRole("principal");
  const amigo = byRole("amigo");
  const amigo2 = byRole("amigo2");

  const family = fonte?.meta?.family || "sans-serif";
  const corNome = fonte?.meta?.cor || "#7A2FB0";
  const corIdade = fonte?.meta?.cor2 || "#1BA67C";

  // baixa tudo em paralelo (embutido = SVG portátil p/ Canva/impressão)
  const [moldSvg, facesJson, maskUri, topUri, bodyUri, principalUri, amigoUri, amigo2Uri, placaUri, fonteUri] =
    await Promise.all([
      fetchText(molde.svg_url),
      fetchText(molde.faces_url),
      fetchDataUri(molde.mask_url),
      papelTop ? fetchDataUri(papelTop.url) : Promise.resolve(null),
      papelBody ? fetchDataUri(papelBody.url) : Promise.resolve(null),
      principal ? fetchDataUri(principal.url) : Promise.resolve(null),
      amigo ? fetchDataUri(amigo.url) : Promise.resolve(null),
      amigo2 ? fetchDataUri(amigo2.url) : Promise.resolve(null),
      placa ? fetchDataUri(placa.url) : Promise.resolve(null),
      fonte ? fetchDataUri(fonte.url) : Promise.resolve(null),
    ]);

  // recorta margens transparentes dos cliparts e usa as dimensões REAIS do desenho
  const [pTrim, aTrim, a2Trim] = await Promise.all([
    principalUri ? trimTransparent(principalUri) : Promise.resolve(null),
    amigoUri ? trimTransparent(amigoUri) : Promise.resolve(null),
    amigo2Uri ? trimTransparent(amigo2Uri) : Promise.resolve(null),
  ]);
  const principalImg = pTrim ? { uri: pTrim.uri, meta: { w: pTrim.w, h: pTrim.h } } : null;
  const amigoImg = aTrim ? { uri: aTrim.uri, meta: { w: aTrim.w, h: aTrim.h } } : null;
  const amigo2Img = a2Trim ? { uri: a2Trim.uri, meta: { w: a2Trim.w, h: a2Trim.h } } : null;

  const vb = moldSvg.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error("Molde SVG sem viewBox");
  const [, , W, H] = vb[1].split(/\s+/).map(Number);
  const moldPath = moldSvg.match(/<path[\s\S]*?\/>/i)?.[0] ?? "";
  const { faces } = JSON.parse(facesJson) as { faces: Face[] };

  // ---- zonas ----
  const maxH = Math.max(...faces.map((f) => f.h));
  const body = faces.filter((f) => f.h >= maxH * 0.6);
  const bodyTop = Math.min(...body.map((f) => f.y));
  const bodyBot = Math.max(...body.map((f) => f.y + f.h));
  const sandY = bodyTop + (bodyBot - bodyTop) * 0.72;

  const maxA = Math.max(...faces.map((f) => f.area));
  const big = faces.filter((f) => f.area >= maxA * 0.45).sort((a, b) => a.x - b.x);
  const nameFace = big
    .slice()
    .sort((a, b) => Math.abs(a.cx - W / 2) - Math.abs(b.cx - W / 2))[0];

  // ---- decorativos da cena aquática (usados quando o tema não tem papel "body") ----
  const alga = (x: number, y: number, s: number, cor: string) =>
    `<path d="M0,0 C-8,-28 8,-40 0,-70 C-6,-92 6,-104 0,-128" transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
  const coral = (x: number, y: number, s: number, cor: string) =>
    `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.9"><path d="M0,0 L0,-42 M0,-18 L-16,-38 M0,-24 L15,-46 M-16,-38 L-20,-58 M15,-46 L20,-64" fill="none" stroke="${cor}" stroke-width="8" stroke-linecap="round"/></g>`;
  const bolhas = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF" opacity="0.55"><circle r="7"/><circle cx="14" cy="-22" r="4.5"/><circle cx="-6" cy="-40" r="6"/><circle cx="10" cy="-60" r="3.5"/></g>`;
  const estrela = (x: number, y: number, s: number, cor: string) =>
    `<path d="M0,-10 L2.9,-3.1 10,-3.1 4.5,1.8 6.5,9 0,4.9 -6.5,9 -4.5,1.8 -10,-3.1 -2.9,-3.1 Z" transform="translate(${x} ${y}) scale(${s})" fill="${cor}" opacity="0.9"/>`;

  const decor = papelBody
    ? ""
    : big
        .map(
          (p) =>
            alga(p.x + p.w * 0.1, sandY + 6, 0.9, "#2E9E7B") +
            coral(p.x + p.w * 0.24, sandY + 12, 0.9, "#E58BB6") +
            coral(p.x + p.w * 0.82, sandY + 14, 0.8, "#C07AD8") +
            estrela(p.x + p.w * 0.55, sandY + 26, 2.0, "#F2A24B") +
            bolhas(p.x + p.w * 0.16, p.y + p.h * 0.25, 1.2) +
            bolhas(p.x + p.w * 0.85, p.y + p.h * 0.4, 1.0)
        )
        .join("");

  // ---- blocos de conteúdo (teto de tamanho) ----
  const plateBlock = (cx: number, cy: number, availW: number) => {
    const plW = Math.min(availW * 0.9, 520);
    const plH = placa ? plW * ((placa.meta?.h || 202) / (placa.meta?.w || 320)) : plW * 0.55;
    const plY = cy - plH * 0.55;
    // placa genérica caprichada (usada quando o tema não tem placa própria):
    // medalhão branco com borda dupla nas cores do tema + estrelinhas
    const genericPlaque = `
      <g>
        <rect x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" rx="${plH * 0.28}" fill="${corNome}" opacity="0.25"/>
        <rect x="${cx - plW / 2 + 6}" y="${plY + 6}" width="${plW - 12}" height="${plH - 12}" rx="${plH * 0.24}" fill="#FFFFFF" opacity="0.96" stroke="${corNome}" stroke-width="6"/>
        <rect x="${cx - plW / 2 + 16}" y="${plY + 16}" width="${plW - 32}" height="${plH - 32}" rx="${plH * 0.2}" fill="none" stroke="${corIdade}" stroke-width="2.5" stroke-dasharray="1 8" stroke-linecap="round"/>
        <path d="M0,-9 L2.6,-2.8 9,-2.8 4,1.6 5.8,8 0,4.4 -5.8,8 -4,1.6 -9,-2.8 -2.6,-2.8 Z" transform="translate(${cx - plW / 2 + 4} ${plY + plH / 2}) scale(1.6)" fill="${corIdade}"/>
        <path d="M0,-9 L2.6,-2.8 9,-2.8 4,1.6 5.8,8 0,4.4 -5.8,8 -4,1.6 -9,-2.8 -2.6,-2.8 Z" transform="translate(${cx + plW / 2 - 4} ${plY + plH / 2}) scale(1.6)" fill="${corIdade}"/>
      </g>`;
    const bg = placaUri
      ? `<image href="${placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}"/>`
      : genericPlaque;
    return `${bg}
    <text x="${cx}" y="${plY + plH * 0.5}" text-anchor="middle" font-family="${family}" font-size="${plW * 0.155}" fill="${corNome}">${esc(nome)}</text>
    ${idade ? `<text x="${cx}" y="${plY + plH * 0.86}" text-anchor="middle" font-family="${family}" font-size="${plW * 0.075}" fill="#FFFFFF" stroke="${corIdade}" stroke-width="1.5" paint-order="stroke">${esc(idade)} anos</text>` : ""}`;
  };
  const clipBlock = (img: { uri: string; meta: { w: number; h: number } } | null, cx: number, availW: number, faceBottom: number, cap: number, capH = 560) => {
    if (!img) return "";
    const ratio = img.meta.h / img.meta.w;
    let aw = Math.min(availW * 0.85, cap);
    let ah = aw * ratio;
    if (ah > capH) { ah = capH; aw = ah / ratio; } // personagens altos não estouram o painel
    const base = Math.min(sandY + 10, faceBottom - 6);
    return `<image href="${img.uri}" x="${cx - aw / 2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet"/>`;
  };
  const amigosBlock = (cx: number, availW: number, faceTop: number, faceBottom: number) => {
    let l = "";
    if (amigoImg) {
      const ratio = amigoImg.meta.h / amigoImg.meta.w;
      let lw = Math.min(availW * 0.5, 260);
      let lh = lw * ratio;
      if (lh > 260) { lh = 260; lw = lh / ratio; }
      l = `<image href="${amigoImg.uri}" x="${cx - lw / 2}" y="${faceTop + 20}" width="${lw}" height="${lh}" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return l + clipBlock(amigo2Img, cx, availW * 0.65, faceBottom, 280, 300);
  };

  let content = "";
  if (big.length === 1) {
    const p = big[0];
    content =
      clipBlock(principalImg, p.x + p.w * 0.18, p.w * 0.3, p.y + p.h, 460) +
      plateBlock(p.cx, p.cy, p.w * 0.42) +
      amigosBlock(p.x + p.w * 0.82, p.w * 0.3, p.y, p.y + p.h);
  } else {
    let flip = 0;
    content = big
      .map((p) => {
        const availW = Math.min(p.w, p.h);
        if (p === nameFace) return plateBlock(p.cx, p.cy, availW * 1.15);
        flip++;
        if (flip % 2 === 1) return clipBlock(principalImg, p.cx, availW, p.y + p.h, 460);
        return amigosBlock(p.cx, availW, p.y, p.y + p.h);
      })
      .join("");
  }

  const bodyFill = papelBody && bodyUri
    ? `<image href="${bodyUri}" x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" preserveAspectRatio="xMidYMid slice"/>`
    : `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#agua)"/>
    <path d="M 0 ${sandY + 24} Q ${W * 0.25} ${sandY - 10} ${W * 0.5} ${sandY + 16} T ${W} ${sandY + 12} L ${W} ${bodyBot} L 0 ${bodyBot} Z" fill="url(#areia)"/>`;

  const fontFace = fonteUri
    ? `<style>@font-face{font-family:'${family}';src:url('${fonteUri}');}</style>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    ${fontFace}
    <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE8F7"/><stop offset="0.55" stop-color="#9AD6EF"/><stop offset="1" stop-color="#7CC5E8"/>
    </linearGradient>
    <linearGradient id="areia" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF0C8"/><stop offset="1" stop-color="#F4DFA3"/>
    </linearGradient>
    <mask id="interior"><image href="${maskUri}" x="0" y="0" width="${W}" height="${H}"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <g mask="url(#interior)">
    ${topUri ? `<image href="${topUri}" x="0" y="0" width="${W}" height="${bodyTop}" preserveAspectRatio="xMidYMid slice"/>` : ""}
    ${bodyFill}
    ${decor}
    ${content}
    <rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="#FFFFFF"/>
  </g>
  <g fill="#111111">${moldPath.replace(/fill="[^"]*"/, "")}</g>
</svg>`;
}

/** SVG → PNG (data URL) via canvas do navegador. */
export async function svgToPngDataUrl(svg: string, width = 2526): Promise<string> {
  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Falha ao renderizar SVG"));
      img.src = url;
    });
    const scale = width / img.width;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function downloadText(filename: string, text: string, mime = "image/svg+xml") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
