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
    const bg = placaUri
      ? `<image href="${placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}"/>`
      : `<rect x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" rx="${plH * 0.2}" fill="#FFFFFF" opacity="0.92" stroke="${corNome}" stroke-width="5"/>`;
    return `${bg}
    <text x="${cx}" y="${plY + plH * 0.5}" text-anchor="middle" font-family="${family}" font-size="${plW * 0.155}" fill="${corNome}">${esc(nome)}</text>
    ${idade ? `<text x="${cx}" y="${plY + plH * 0.86}" text-anchor="middle" font-family="${family}" font-size="${plW * 0.075}" fill="#FFFFFF" stroke="${corIdade}" stroke-width="1.5" paint-order="stroke">${esc(idade)} anos</text>` : ""}`;
  };
  const clipBlock = (uri: string | null, meta: Record<string, any> | undefined, cx: number, availW: number, faceBottom: number, cap: number) => {
    if (!uri) return "";
    const ratio = (meta?.h || 1) / (meta?.w || 1);
    const aw = Math.min(availW * 0.85, cap);
    const ah = aw * ratio;
    const base = Math.min(sandY + 10, faceBottom - 6);
    return `<image href="${uri}" x="${cx - aw / 2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet"/>`;
  };
  const amigosBlock = (cx: number, availW: number, faceTop: number, faceBottom: number) => {
    const l = amigoUri
      ? `<image href="${amigoUri}" x="${cx - Math.min(availW * 0.5, 260) / 2}" y="${faceTop + 20}" width="${Math.min(availW * 0.5, 260)}" height="${Math.min(availW * 0.5, 260) * ((amigo?.meta?.h || 1) / (amigo?.meta?.w || 1))}" preserveAspectRatio="xMidYMid meet"/>`
      : "";
    return l + clipBlock(amigo2Uri, amigo2?.meta, cx, availW * 0.65, faceBottom, 280);
  };

  let content = "";
  if (big.length === 1) {
    const p = big[0];
    content =
      clipBlock(principalUri, principal?.meta, p.x + p.w * 0.18, p.w * 0.3, p.y + p.h, 460) +
      plateBlock(p.cx, p.cy, p.w * 0.42) +
      amigosBlock(p.x + p.w * 0.82, p.w * 0.3, p.y, p.y + p.h);
  } else {
    let flip = 0;
    content = big
      .map((p) => {
        const availW = Math.min(p.w, p.h);
        if (p === nameFace) return plateBlock(p.cx, p.cy, availW * 1.15);
        flip++;
        if (flip % 2 === 1) return clipBlock(principalUri, principal?.meta, p.cx, availW, p.y + p.h, 460);
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
