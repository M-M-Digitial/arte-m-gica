// compose-kit — motor do padrão Alice: biblioteca de temas + molde vetorial +
// nome → arte SVG editável. O layout é PURO (montarSvgKit) para rodar igual no
// navegador e no harness de prévia (tools/ingestao/preview-kit.mjs).

import { ALICE_QUALITY_STANDARD } from "../../supabase/functions/_shared/alice-quality-standard.ts";
import { assertThemeReadyForComposition } from "./theme-curation";

export interface MoldeCompose {
  name?: string;
  svg_url: string;
  mask_url: string;
  faces_url: string;
}

export interface TemaAsset {
  kind: string;
  name: string;
  url: string;
  role: string;
  meta?: {
    family?: string;
    cor?: string;
    cor2?: string;
    w?: number;
    h?: number;
    usage?: AssetUsage;
    enabled?: boolean;
    [key: string]: unknown;
  };
}

export interface KitPalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export interface KitTypography {
  family?: string;
  scale?: number;
  useThemeFont?: boolean;
}

export interface ComposeInput {
  molde: MoldeCompose;
  assets: TemaAsset[];
  nome: string;
  idade?: string;
  palette?: KitPalette;
  typography?: KitTypography;
}

interface Face { x: number; y: number; w: number; h: number; cx: number; cy: number; area: number }

export type AssetUsage = "hero" | "ornament" | "border" | "panel";

export interface ClipartDados {
  uri: string;
  w: number;
  h: number;
  name?: string;
  role?: string;
  usage?: AssetUsage;
  visibleCoverage?: number;
}

export interface PixelBounds { minX: number; minY: number; maxX: number; maxY: number }

export function findVisibleBounds(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
  alphaThreshold = 24,
): PixelBounds | null {
  const columns = new Uint32Array(width);
  const rows = new Uint32Array(height);
  let visiblePixels = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      columns[x]++;
      rows[y]++;
      visiblePixels++;
    }
  }

  if (visiblePixels === 0) return null;

  const minColumnPixels = Math.max(2, Math.floor(height * 0.002));
  const minRowPixels = Math.max(2, Math.floor(width * 0.002));
  let minX = columns.findIndex((count) => count >= minColumnPixels);
  let minY = rows.findIndex((count) => count >= minRowPixels);
  let maxX = -1;
  let maxY = -1;
  for (let x = width - 1; x >= 0; x--) {
    if (columns[x] >= minColumnPixels) { maxX = x; break; }
  }
  for (let y = height - 1; y >= 0; y--) {
    if (rows[y] >= minRowPixels) { maxY = y; break; }
  }

  if (minX >= 0 && minY >= 0 && maxX >= minX && maxY >= minY) {
    return { minX, minY, maxX, maxY };
  }

  minX = width;
  minY = height;
  maxX = 0;
  maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rgba[(y * width + x) * 4 + 3] <= alphaThreshold) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, minY, maxX, maxY };
}

export function classifyClipartUsage(asset: ClipartDados): AssetUsage {
  if (asset.usage) return asset.usage;
  const semantic = normalizarId(`${asset.role ?? ""} ${asset.name ?? ""}`);
  if (/ornamento|decoracao|flor|rosa/.test(semantic)) return "ornament";
  if (/borda|border|faixa|rodape/.test(semantic)) return "border";
  if (/painel|panel|textura/.test(semantic)) return "panel";
  const ratio = asset.h > 0 ? asset.w / asset.h : 1;
  if (ratio >= 2.15) return "border";
  if ((asset.visibleCoverage ?? 0) >= 0.84 && ratio >= 1.1) return "panel";
  return "hero";
}

// Analise do papel do corpo para escolher a densidade e a escala dos elementos.
export interface PapelInfo { busy: boolean; corMedia: string }

export interface KitDados {
  moldName?: string;
  moldSvg: string;
  facesJson: string;
  maskUri: string;
  papelTopUri: string | null;
  papelBodyUri: string | null;
  papelBodyInfo?: PapelInfo | null;
  principal?: ClipartDados | null;
  amigo?: ClipartDados | null;
  amigo2?: ClipartDados | null;
  personagens?: ClipartDados[];
  placaUri: string | null;
  placaMeta: { w?: number; h?: number } | null;
  fonteFamily: string;
  fonteUri: string | null;
  fonteScale?: number;
  corNome: string;
  corIdade: string;
  corFundo?: string;
  corAcento?: string;
  nome: string;
  idade?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const escAttr = (s: string) => esc(s).replace(/'/g, "&apos;");

// Os moldes gerados pelo pipeline podem conter mais de um path. Manter todas
// as geometrias evita perder abas, linhas de dobra ou recortes no SVG final.
const extractMoldGeometry = (moldSvg: string) =>
  Array.from(moldSvg.matchAll(/<(?:path|line|polyline|polygon|rect|circle|ellipse)\b[^>]*?(?:\/>|>)/gi))
    .map(([markup]) => markup)
    .join("\n");

// escurece uma cor hex por um fator (0.12 = 12% mais escura) — tons da faixa de chão
const escurecer = (hex: string, fator: number) => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const f = (i: number) => Math.min(255, Math.max(0, Math.round(parseInt(m.slice(i, i + 2), 16) * (1 - fator))))
    .toString(16).padStart(2, "0");
  return `#${f(0)}${f(2)}${f(4)}`;
};

// luminância aproximada (0-1) para garantir contraste do nome na plaquinha
const luminancia = (hex: string) => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return 0.5;
  const c = (i: number) => parseInt(m.slice(i, i + 2), 16) / 255;
  return 0.299 * c(0) + 0.587 * c(2) + 0.114 * c(4);
};

// clareia uma cor em direção ao branco (0.8 = 80% do caminho) — céu do tema
const clarear = (hex: string, fator: number) => {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const f = (i: number) => Math.round(parseInt(m.slice(i, i + 2), 16) + (255 - parseInt(m.slice(i, i + 2), 16)) * fator)
    .toString(16).padStart(2, "0");
  return `#${f(0)}${f(2)}${f(4)}`;
};

const normalizarId = (value?: string) =>
  (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

// ---------------------------------------------------------------------------
// LAYOUT PURO — "Padrão Alice": papel na escala certa, personagem grande
// ancorado no chão, faixa de cenário, plaquinha de nome com contraste.
// ---------------------------------------------------------------------------
export function montarSvgKit(d: KitDados): string {
  const { nome, idade, corNome, corIdade } = d;
  const corFundo = d.corFundo || "#CDEFFB";
  const corAcento = d.corAcento || corNome;
  const paletteTint = Boolean(d.corFundo || d.corAcento);
  const qualityStandard = ALICE_QUALITY_STANDARD.layout;
  const family = d.fonteFamily || "sans-serif";
  const familyAttr = escAttr(family);
  const isMilk = normalizarId(d.moldName).includes("caixa milk");

  const vb = d.moldSvg.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error("Molde SVG sem viewBox");
  const [, , W, H] = vb[1].split(/\s+/).map(Number);
  const moldGeometry = extractMoldGeometry(d.moldSvg);
  const { faces } = JSON.parse(d.facesJson) as { faces: Face[] };

  // ---- zonas ----
  const maxA = Math.max(...faces.map((f) => f.area));
  const big = faces.filter((f) => f.area >= maxA * 0.45).sort((a, b) => a.x - b.x);
  const bodyTop = Math.min(...big.map((f) => f.y));
  const bodyBot = Math.max(...big.map((f) => f.y + f.h));
  const defaultNameFace = big
    .slice()
    .sort((a, b) => Math.abs(a.cx - W / 2) - Math.abs(b.cx - W / 2))[0];
  const milkNameFaces = isMilk && big.length >= 4 ? [big[1], big[3]] : [];
  const nameFace = milkNameFaces[0] ?? defaultNameFace;
  const avgFaceW = big.reduce((s, f) => s + f.w, 0) / big.length;
  const avgFaceH = big.reduce((s, f) => s + f.h, 0) / big.length;

  // Estampas densas continuam coordenadas com o tema, mas recebem mais respiro
  // entre os elementos. O papel nunca vira um retângulo isolado sem função.
  const estampaDensa = !!(d.papelBodyUri && d.papelBodyInfo?.busy);
  const compositionProfile = estampaDensa && big.length >= 4 ? "modular" : "cenario";

  const sourceAssets = d.personagens?.length
    ? d.personagens
    : [d.principal, d.amigo, d.amigo2].filter(Boolean) as ClipartDados[];
  const uniqueAssets = sourceAssets.filter(
    (asset, index, list) => list.findIndex((candidate) => candidate.uri === asset.uri) === index,
  );
  const heroAssets = uniqueAssets.filter((asset) => classifyClipartUsage(asset) === "hero");
  const ornamentAssets = uniqueAssets.filter((asset) => classifyClipartUsage(asset) === "ornament");
  const borderAssets = uniqueAssets.filter((asset) => classifyClipartUsage(asset) === "border");
  const panelAssets = uniqueAssets.filter((asset) => classifyClipartUsage(asset) === "panel");

  const principalHero = heroAssets.find((asset) => asset.role === "principal") ?? heroAssets[0];
  const alternateHeroes = heroAssets.filter((asset) => asset !== principalHero);
  const nameSeed = Array.from(nome).reduce((sum, char) => sum + char.codePointAt(0)!, 0);
  const alternateOffset = alternateHeroes.length ? nameSeed % alternateHeroes.length : 0;
  const orderedHeroes = principalHero
    ? [
        principalHero,
        ...alternateHeroes.slice(alternateOffset),
        ...alternateHeroes.slice(0, alternateOffset),
      ]
    : [];

  // ---- fundo: papel em ESCALA DE MOTIVO (pattern), não imagem esticada ----
  // o spec fala do MOTIVO interno (~8% da face); cada arquivo de papel já traz
  // uma grade de ~6-8 motivos, então o tile certo é ~metade da face no corpo
  // e mais fino nas abas (lê como textura)
  const motCorpo = Math.max(180, avgFaceW * 0.5);
  const motTopo = Math.max(120, avgFaceW * 0.33);
  const defsPapel: string[] = [];
  let fundoTopo = "";
  let fundoBase = "";
  let fundoCorpo = "";
  if (d.papelTopUri) {
    defsPapel.push(
      `<pattern id="papelTop" patternUnits="userSpaceOnUse" width="${motTopo}" height="${motTopo}"><image href="${d.papelTopUri}" x="0" y="0" width="${motTopo}" height="${motTopo}" preserveAspectRatio="xMidYMid slice"/></pattern>`
    );
    fundoTopo = paletteTint
      ? `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="${corNome}"/><rect x="0" y="0" width="${W}" height="${bodyTop}" fill="url(#papelTop)" opacity="0.48"/>`
      : `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="url(#papelTop)"/>`;
    fundoBase = paletteTint
      ? `<rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="${corNome}"/><rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="url(#papelTop)" opacity="0.42"/>`
      : `<rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="url(#papelTop)"/>`;
  } else {
    const fechamento = paletteTint ? corNome : clarear(corIdade, 0.18);
    fundoTopo = `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="${fechamento}"/>`;
    fundoBase = `<rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="${fechamento}"/>`;
  }
  if (d.papelBodyUri) {
    defsPapel.push(
      `<pattern id="papelBody" patternUnits="userSpaceOnUse" width="${motCorpo}" height="${motCorpo}"><image href="${d.papelBodyUri}" x="0" y="0" width="${motCorpo}" height="${motCorpo}" preserveAspectRatio="xMidYMid slice"/></pattern>`
    );
    fundoCorpo = paletteTint
      ? `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="${corFundo}"/><rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#papelBody)" opacity="${estampaDensa ? 0.44 : 0.52}"/>`
      : `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#papelBody)"/>`;
  } else {
    fundoCorpo = `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#ceu)"/>`;
  }

  const firstBodyFace = big[0];
  const lastBodyFace = big[big.length - 1];
  const bodyRowX = firstBodyFace?.x ?? 0;
  const bodyRowW = firstBodyFace && lastBodyFace
    ? lastBodyFace.x + lastBodyFace.w - firstBodyFace.x
    : W;
  const borderAsset = borderAssets[0];
  const borderRatio = borderAsset && borderAsset.h > 0 ? borderAsset.w / borderAsset.h : 1;
  const borderHeight = borderAsset
    ? Math.min(avgFaceH * 0.24, bodyRowW / Math.max(1, borderRatio))
    : 0;
  const faixaTema = borderAsset
    ? `<image data-theme-border="true" href="${borderAsset.uri}" xlink:href="${borderAsset.uri}" x="${bodyRowX}" y="${bodyBot - borderHeight * 0.92}" width="${bodyRowW}" height="${borderHeight}" preserveAspectRatio="xMidYMid meet"/>`
    : !d.papelBodyUri
      ? `<rect x="${bodyRowX}" y="${bodyBot - avgFaceH * 0.14}" width="${bodyRowW}" height="${avgFaceH * 0.14}" fill="${corIdade}" opacity="0.82"/><path d="M ${bodyRowX} ${bodyBot - avgFaceH * 0.14} H ${bodyRowX + bodyRowW}" stroke="#FFFFFF" stroke-width="${Math.max(3, avgFaceH * 0.014)}" opacity="0.82"/>`
      : "";

  // ---- personagem grande ancorado na base da face ----
  const personagemBlock = (
    img: ClipartDados,
    f: Face,
    alturaPct: number,
    espelhar = false,
    baseOverride?: number,
  ) => {
    const ratio = img.w / img.h;
    let ah = f.h * alturaPct;
    let aw = ah * ratio;
    if (aw > f.w * qualityStandard.stickerMaxWidthToFace) {
      aw = f.w * qualityStandard.stickerMaxWidthToFace;
      ah = aw / ratio;
    }
    const cx = f.cx;
    const base = baseOverride ?? bodyBot - Math.max(4, borderHeight * 0.08);
    const imagem = `<image href="${img.uri}" xlink:href="${img.uri}" x="${cx - aw / 2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet" filter="url(#adesivo)"/>`;
    return espelhar ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${imagem}</g>` : imagem;
  };

  const monogramBlock = (f: Face) => {
    const size = Math.min(f.w * 0.68, f.h * 0.60);
    const cx = f.cx;
    const cy = f.y + f.h * 0.48;
    const initial = esc(Array.from(nome.trim())[0]?.toUpperCase() || "");
    return `<g data-theme-monogram="true">
      <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.43}" ry="${size * 0.50}" fill="#FFFDF8" fill-opacity="0.92" stroke="${corAcento}" stroke-width="${Math.max(4, size * 0.035)}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.36}" ry="${size * 0.43}" fill="${d.papelTopUri ? "url(#papelTop)" : clarear(corNome, 0.68)}" stroke="${corNome}" stroke-width="${Math.max(2, size * 0.015)}"/>
      <text x="${cx}" y="${cy + size * 0.04}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${size * 0.42}" fill="#FFFFFF" stroke="${escurecer(corNome, 0.25)}" stroke-width="${size * 0.025}" paint-order="stroke">${initial}</text>
    </g>`;
  };

  const panelBlock = (f: Face, asset: ClipartDados) => {
    const panelW = f.w * 0.76;
    const panelH = f.h * 0.58;
    const x = f.cx - panelW / 2;
    const y = f.y + f.h * 0.16;
    return `<g data-theme-panel="true">
      <rect x="${x - f.w * 0.025}" y="${y - f.h * 0.025}" width="${panelW + f.w * 0.05}" height="${panelH + f.h * 0.05}" rx="${f.w * 0.06}" fill="#FFFDF8" fill-opacity="0.90" stroke="${corIdade}" stroke-width="${Math.max(3, f.w * 0.012)}"/>
      <image href="${asset.uri}" xlink:href="${asset.uri}" x="${x}" y="${y}" width="${panelW}" height="${panelH}" preserveAspectRatio="xMidYMid slice" opacity="0.82"/>
    </g>`;
  };

  // ---- plaquinha de nome com contraste forte ----
  // estudo Alice: largura mediana 58% da face, encostada na linha do chão
  // (o personagem pode sobrepor a placa — assinatura dos kits reais)
  const ornamentBlock = (f: Face, asset?: ClipartDados) => {
    if (!asset) return "";
    const ratio = asset.h > 0 ? asset.w / asset.h : 1;
    let aw = f.w * 0.66;
    let ah = aw / Math.max(0.1, ratio);
    if (ah > f.h * 0.32) {
      ah = f.h * 0.32;
      aw = ah * ratio;
    }
    const x = f.cx - aw / 2;
    const y = f.y + f.h * 0.055;
    return `<image data-theme-ornament="true" href="${asset.uri}" xlink:href="${asset.uri}" x="${x}" y="${y}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMid meet"/>`;
  };

  const plateBlock = (f: Face) => {
    // texto sempre legível: cores de tema claras são escurecidas na plaquinha
    const corTexto = luminancia(corNome) > 0.6 ? escurecer(corNome, 0.45) : corNome;
    const nameWidth = isMilk ? qualityStandard.milkNamePlateWidth : qualityStandard.namePlateWidth;
    const plW = Math.min(
      f.w * (nameWidth.target / 100),
      avgFaceW * (nameWidth.max / 100),
    );
    const temPlaca = !!d.placaUri;
    const maxPlateHeight = f.h * (isMilk ? 0.28 : 0.32);
    const plH = temPlaca
      ? Math.min(maxPlateHeight, plW * ((d.placaMeta?.h || 202) / (d.placaMeta?.w || 320)))
      : maxPlateHeight;
    const cx = f.cx;
    const plY = bodyBot - plH - f.h * 0.045;
    const inset = Math.max(5, plH * 0.075);
    const fundoPlaca = temPlaca
      ? `<image href="${d.placaUri}" xlink:href="${d.placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" preserveAspectRatio="xMidYMid meet"/>`
      : `<rect x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" rx="${plH * 0.24}" fill="${corIdade}" stroke="#FFFDF8" stroke-width="${Math.max(5, plH * 0.055)}"/>
        <rect x="${cx - plW / 2 + inset}" y="${plY + inset}" width="${plW - inset * 2}" height="${plH - inset * 2}" rx="${plH * 0.18}" fill="#FFFDF8" fill-opacity="0.96" stroke="${corNome}" stroke-width="${Math.max(3, plH * 0.027)}"/>
        <path d="M ${cx - plW * 0.43} ${plY + plH * 0.5} l ${plH * 0.075} -${plH * 0.075} l ${plH * 0.075} ${plH * 0.075} l -${plH * 0.075} ${plH * 0.075} z M ${cx + plW * 0.43} ${plY + plH * 0.5} l ${plH * 0.075} -${plH * 0.075} l ${plH * 0.075} ${plH * 0.075} l -${plH * 0.075} ${plH * 0.075} z" fill="${corAcento}"/>`;
    // O SVG comprime apenas a largura quando necessario. Assim nomes longos
    // continuam altos e legiveis, sem ultrapassar a plaquinha.
    const fonteScale = Math.min(1.5, Math.max(0.85, d.fonteScale ?? 1.15));
    const baseFontSize = plH * (isMilk ? 0.30 : 0.33);
    const maxFontSize = plH * (idade?.trim() ? 0.42 : 0.50);
    const fsNome = Math.min(baseFontSize * fonteScale, maxFontSize);
    const larguraEstimada = fsNome * Math.max(3, nome.length) * 0.56;
    const nomeFit = larguraEstimada > plW * 0.76
      ? ` textLength="${plW * 0.76}" lengthAdjust="spacingAndGlyphs"`
      : "";
    const idadeLimpa = idade?.trim() || "";
    const fsIdade = fsNome * qualityStandard.ageToNameFontRatio.target;
    const idadeTxt = idadeLimpa
      ? `<text x="${cx}" y="${plY + plH * 0.75}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${fsIdade}" fill="${corTexto}">${esc(idadeLimpa)} ${/^\d+$/.test(idadeLimpa) ? "anos" : ""}</text>`
      : "";
    const nomeY = plY + plH * (idadeLimpa ? 0.43 : 0.52);
    return `<g data-name-plate="true">
      ${fundoPlaca}
      <text x="${cx}" y="${nomeY}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${fsNome}"${nomeFit} fill="${corTexto}" stroke="#FFFFFF" stroke-width="${fsNome * 0.08}" paint-order="stroke">${esc(nome)}</text>
      ${idadeTxt}
    </g>`;
  };

  // ---- uma funcao visual por face: personagem, nome, painel ou monograma ----
  const heroTarget = compositionProfile === "modular"
    ? qualityStandard.modularElementHeight.target / 100
    : qualityStandard.heroHeight.target / 100;
  const heroHeightFor = (img: ClipartDados) => {
    const ratio = img.h > 0 ? img.w / img.h : 1;
    return ratio >= 1.1 ? Math.max(heroTarget, 0.86) : Math.max(heroTarget, 0.90);
  };
  let content = "";
  if (big.length === 1) {
    const f = big[0];
    const heroFace = { ...f, w: f.w * 0.52, cx: f.x + f.w * 0.28 } as Face;
    const plateFace = { ...f, w: f.w * 0.50, cx: f.x + f.w * 0.73 } as Face;
    content =
      (orderedHeroes[0] ? personagemBlock(orderedHeroes[0], heroFace, heroHeightFor(orderedHeroes[0])) : monogramBlock(heroFace)) +
      plateBlock(plateFace);
  } else {
    let heroIndex = 0;
    let panelUsed = false;
    let nameIndex = 0;
    content = big
      .map((f) => {
        if (milkNameFaces.includes(f) || f === nameFace) {
          const ornament = ornamentAssets.length
            ? ornamentBlock(f, ornamentAssets[nameIndex % ornamentAssets.length])
            : "";
          nameIndex++;
          return ornament + plateBlock(f);
        }
        const img = orderedHeroes[heroIndex++];
        if (img) return personagemBlock(img, f, heroHeightFor(img));
        if (!panelUsed && panelAssets[0]) {
          panelUsed = true;
          return panelBlock(f, panelAssets[0]);
        }
        return monogramBlock(f);
      })
      .join("");
  }

  const fontFace = d.fonteUri
    ? `<style>@font-face{font-family:'${family}';src:url('${d.fonteUri}');}</style>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <title>Kit personalizado de ${esc(nome)}</title>
  <metadata id="alice-quality-standard">${ALICE_QUALITY_STANDARD.version}</metadata>
  <metadata id="alice-composition-profile">${compositionProfile}</metadata>
  <defs>
    ${fontFace}
    ${defsPapel.join("\n    ")}
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${clarear(corFundo, 0.28)}"/><stop offset="1" stop-color="${corFundo}"/>
    </linearGradient>
    <filter id="adesivo" x="-8%" y="-8%" width="116%" height="116%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${Math.max(4, Math.round(avgFaceH * qualityStandard.stickerOutlineToFaceHeight))}" result="dila"/>
      <feFlood flood-color="#FFFFFF" result="cor"/>
      <feComposite in="cor" in2="dila" operator="in" result="contorno"/>
      <feMerge><feMergeNode in="contorno"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="paperShape" clipPathUnits="userSpaceOnUse">${moldGeometry}</clipPath>
    <mask id="interior" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" mask-type="alpha" style="mask-type:alpha"><image href="${d.maskUri}" xlink:href="${d.maskUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <g mask="url(#interior)" clip-path="url(#paperShape)">
    ${fundoTopo}
    ${fundoBase}
    ${fundoCorpo}
    ${faixaTema}
    ${content}
  </g>
  <g id="molde-tecnico" fill="#111111" stroke="#111111">${moldGeometry}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// IO do navegador
// ---------------------------------------------------------------------------
const textCache = new Map<string, Promise<string>>();
const dataUriCache = new Map<string, Promise<string>>();
type TrimmedClipart = Pick<ClipartDados, "uri" | "w" | "h" | "visibleCoverage">;

const trimCache = new Map<string, Promise<TrimmedClipart>>();

const fetchText = (url: string) => {
  const cached = textCache.get(url);
  if (cached) return cached;
  const request = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Falha ao baixar ${url}`);
    return r.text();
  })().catch((error) => {
    textCache.delete(url);
    throw error;
  });
  textCache.set(url, request);
  return request;
};

const fetchDataUri = (url: string) => {
  const cached = dataUriCache.get(url);
  if (cached) return cached;
  const request = (async () => {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Falha ao baixar ${url}`);
    const blob = await r.blob();
    return new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
  })().catch((error) => {
    dataUriCache.delete(url);
    throw error;
  });
  dataUriCache.set(url, request);
  return request;
};

function trimTransparent(dataUri: string): Promise<TrimmedClipart> {
  const cached = trimCache.get(dataUri);
  if (cached) return cached;
  const request = trimTransparentUncached(dataUri).catch((error) => {
    trimCache.delete(dataUri);
    throw error;
  });
  trimCache.set(dataUri, request);
  return request;
}

async function trimTransparentUncached(dataUri: string): Promise<TrimmedClipart> {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext("2d")!;
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  const bounds = findVisibleBounds(d, cv.width, cv.height);
  if (!bounds || bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY) {
    return { uri: dataUri, w: cv.width, h: cv.height, visibleCoverage: 0 };
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
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  out.getContext("2d")!.drawImage(cv, minX, minY, w, h, 0, 0, w, h);
  return { uri: out.toDataURL("image/png"), w, h, visibleCoverage };
}

// mede a "densidade" do papel (desvio-padrão de luminância em 32×32) e a cor
// média — decide se ele cobre o corpo ou vira estampa de destaque
async function analisarPapel(dataUri: string): Promise<PapelInfo> {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const cv = document.createElement("canvas");
  cv.width = 32; cv.height = 32;
  const cx = cv.getContext("2d")!;
  cx.drawImage(img, 0, 0, 32, 32);
  const d = cx.getImageData(0, 0, 32, 32).data;
  let sr = 0, sg = 0, sb = 0;
  const lums: number[] = [];
  for (let i = 0; i < 1024; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    sr += r; sg += g; sb += b;
    lums.push(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const media = lums.reduce((a, b) => a + b, 0) / lums.length;
  const desvio = Math.sqrt(lums.reduce((a, l) => a + (l - media) ** 2, 0) / lums.length);
  const hex = (v: number) => Math.round(v / 1024).toString(16).padStart(2, "0");
  return { busy: desvio > 26, corMedia: `#${hex(sr)}${hex(sg)}${hex(sb)}` };
}

export async function composeKit({ molde, assets, nome, idade, palette, typography }: ComposeInput): Promise<string> {
  if (!molde.svg_url || !molde.mask_url || !molde.faces_url) {
    throw new Error("Molde incompleto: geometria, máscara ou faces ausentes.");
  }
  assertThemeReadyForComposition(assets);
  const byRole = (role: string) => assets.find((a) => a.role === role);
  const fonteTema = assets.find((a) => a.kind === "fonte");
  const fonte = typography?.useThemeFont === false ? undefined : fonteTema;
  const placa = assets.find((a) => a.kind === "placa");
  const papelTop = byRole("top");
  const papelBody = byRole("body");
  const rolePriority = (role: string) => {
    if (role === "principal") return 0;
    if (role === "amigo") return 1;
    if (role === "amigo2") return 2;
    return 3;
  };
  const cliparts = assets
    .filter((asset) => asset.kind === "clipart" && asset.url && asset.meta?.enabled !== false)
    .filter((asset, index, list) => list.findIndex((candidate) => candidate.url === asset.url) === index)
    .sort((a, b) => rolePriority(a.role) - rolePriority(b.role));

  const [moldSvg, facesJson, maskUri, topUri, bodyUri, placaUri, fonteUri, clipartUris] =
    await Promise.all([
      fetchText(molde.svg_url),
      fetchText(molde.faces_url),
      fetchDataUri(molde.mask_url),
      papelTop ? fetchDataUri(papelTop.url) : Promise.resolve(null),
      papelBody ? fetchDataUri(papelBody.url) : Promise.resolve(null),
      placa ? fetchDataUri(placa.url) : Promise.resolve(null),
      fonte ? fetchDataUri(fonte.url) : Promise.resolve(null),
      Promise.all(cliparts.map((clipart) => fetchDataUri(clipart.url))),
    ]);

  const [personagens, bodyInfo] = await Promise.all([
    Promise.all(clipartUris.map((uri) => trimTransparent(uri))),
    bodyUri ? analisarPapel(bodyUri).catch(() => null) : Promise.resolve(null),
  ]);

  return montarSvgKit({
    moldSvg,
    moldName: molde.name,
    facesJson,
    maskUri,
    papelTopUri: topUri,
    papelBodyUri: bodyUri,
    papelBodyInfo: bodyInfo,
    personagens: personagens.map((trimmed, index) => {
      const asset = cliparts[index];
      const usage = asset?.meta?.usage;
      return {
        ...trimmed,
        name: asset?.name,
        role: asset?.role,
        usage: usage === "hero" || usage === "ornament" || usage === "border" || usage === "panel"
          ? usage
          : undefined,
      };
    }),
    placaUri,
    placaMeta: placa?.meta ?? null,
    fonteFamily: typography?.family || fonte?.meta?.family || "sans-serif",
    fonteUri,
    fonteScale: typography?.scale,
    corNome: palette?.primary || fonteTema?.meta?.cor || "#7A2FB0",
    corIdade: palette?.secondary || fonteTema?.meta?.cor2 || "#1BA67C",
    corFundo: palette?.background,
    corAcento: palette?.accent,
    nome,
    idade,
  });
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
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadDataUrl(filename: string, dataUrl: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}
