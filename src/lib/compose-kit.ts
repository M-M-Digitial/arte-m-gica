// compose-kit — motor do padrão Alice: biblioteca de temas + molde vetorial +
// nome → arte SVG editável. O layout é PURO (montarSvgKit) para rodar igual no
// navegador e no harness de prévia (tools/ingestao/preview-kit.mjs).

import { ALICE_QUALITY_STANDARD } from "../../supabase/functions/_shared/alice-quality-standard.ts";

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
    [key: string]: unknown;
  };
}

export interface KitPalette {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
}

export interface ComposeInput {
  molde: MoldeCompose;
  assets: TemaAsset[];
  nome: string;
  idade?: string;
  palette?: KitPalette;
}

interface Face { x: number; y: number; w: number; h: number; cx: number; cy: number; area: number }

export interface ClipartDados { uri: string; w: number; h: number }

// análise do papel do corpo: estampas densas ("busy") viram destaque em faces
// alternadas/abas (padrão Alice), nunca papel de parede do corpo inteiro
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
  const maxH = Math.max(...faces.map((f) => f.h));
  const body = faces.filter((f) => f.h >= maxH * 0.6);
  const bodyTop = Math.min(...body.map((f) => f.y));
  const bodyBot = Math.max(...body.map((f) => f.y + f.h));

  const maxA = Math.max(...faces.map((f) => f.area));
  const big = faces.filter((f) => f.area >= maxA * 0.45).sort((a, b) => a.x - b.x);
  const defaultNameFace = big
    .slice()
    .sort((a, b) => Math.abs(a.cx - W / 2) - Math.abs(b.cx - W / 2))[0];
  const milkNameFaces = isMilk && big.length >= 4 ? [big[1], big[3]] : [];
  const nameFace = milkNameFaces[0] ?? defaultNameFace;
  const avgFaceW = big.reduce((s, f) => s + f.w, 0) / big.length;
  const avgFaceH = big.reduce((s, f) => s + f.h, 0) / big.length;

  // face de respiro (padrão A-B-A-C dos kits reais): sem personagem; quando o
  // papel do corpo é estampa densa, é ela que recebe a estampa em destaque
  const respiro = big.length >= 4
    ? big.filter((f) => f !== nameFace).sort((a, b) => Math.abs(b.cx - W / 2) - Math.abs(a.cx - W / 2))[0]
    : null;

  // Estampas densas com quatro ou mais faces usam a linguagem modular vista
  // em caixas de mercado: corpo calmo, uma face estampada e elementos menores.
  const estampaDensa = !!(d.papelBodyUri && d.papelBodyInfo?.busy);
  const compositionProfile = estampaDensa && big.length >= 4 ? "modular" : "cenario";

  const lowerBandTarget = compositionProfile === "modular"
    ? qualityStandard.modularLowerBand.target
    : qualityStandard.floorBand.target;
  const chaoAltura = avgFaceH * (lowerBandTarget / 100);
  const chaoY = bodyBot - chaoAltura;

  // ---- fundo: papel em ESCALA DE MOTIVO (pattern), não imagem esticada ----
  // o spec fala do MOTIVO interno (~8% da face); cada arquivo de papel já traz
  // uma grade de ~6-8 motivos, então o tile certo é ~metade da face no corpo
  // e mais fino nas abas (lê como textura)
  const motCorpo = Math.max(180, avgFaceW * 0.5);
  const motTopo = Math.max(120, avgFaceW * 0.33);
  const defsPapel: string[] = [];
  let fundoTopo = "";
  let fundoCorpo = "";
  if (d.papelTopUri) {
    defsPapel.push(
      `<pattern id="papelTop" patternUnits="userSpaceOnUse" width="${motTopo}" height="${motTopo}"><image href="${d.papelTopUri}" x="0" y="0" width="${motTopo}" height="${motTopo}" preserveAspectRatio="xMidYMid slice"/></pattern>`
    );
    fundoTopo = `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="url(#papelTop)"/>`;
  } else {
    // abas nunca ficam sem tratamento: cor sólida do tema
    fundoTopo = `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="${corIdade}" opacity="0.30"/>`;
  }
  let destaqueEstampa = "";
  if (d.papelBodyUri && !estampaDensa) {
    // papel calmo (aquarela/wash): cobre o corpo inteiro, como nos murais da Alice
    defsPapel.push(
      `<pattern id="papelBody" patternUnits="userSpaceOnUse" width="${motCorpo}" height="${motCorpo}"><image href="${d.papelBodyUri}" x="0" y="0" width="${motCorpo}" height="${motCorpo}" preserveAspectRatio="xMidYMid slice"/></pattern>`
    );
    fundoCorpo = `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#papelBody)"/>`;
  } else if (estampaDensa) {
    // estampa densa: o corpo vira cenário limpo (céu no tom do papel) e a
    // estampa aparece em destaque só na face de respiro (padrão CENA/ESTAMPA)
    const base = d.papelBodyInfo?.corMedia || corIdade;
    defsPapel.push(
      `<pattern id="papelBody" patternUnits="userSpaceOnUse" width="${motCorpo}" height="${motCorpo}"><image href="${d.papelBodyUri}" x="0" y="0" width="${motCorpo}" height="${motCorpo}" preserveAspectRatio="xMidYMid slice"/></pattern>`,
      `<linearGradient id="ceuTema" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${clarear(base, 0.85)}"/><stop offset="1" stop-color="${clarear(base, 0.6)}"/></linearGradient>`
    );
    fundoCorpo = `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#ceuTema)"/>`;
    if (respiro) {
      destaqueEstampa = `<rect x="${respiro.x}" y="${bodyTop}" width="${respiro.w}" height="${bodyBot - bodyTop}" fill="url(#papelBody)"/>`;
    }
  } else {
    fundoCorpo = `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#ceu)"/>`;
  }

  // ---- faixa de cenário (chão) na base do corpo — sempre presente ----
  const morros: string[] = [];
  const passo = avgFaceW * 0.9;
  for (let x = -passo * 0.5; x < W + passo; x += passo) {
    morros.push(`M ${x} ${bodyBot} L ${x} ${chaoY + chaoAltura * 0.45} Q ${x + passo * 0.5} ${chaoY - chaoAltura * 0.35} ${x + passo} ${chaoY + chaoAltura * 0.45} L ${x + passo} ${bodyBot} Z`);
  }
  // dois tons (colina clara atrás + base ~12% mais escura), padrão dos kits reais
  const faixaChao = `
    <path d="${morros.join(" ")}" fill="${corIdade}" opacity="0.95"/>
    <path d="M 0 ${chaoY + chaoAltura * 0.5} Q ${W * 0.25} ${chaoY + chaoAltura * 0.18} ${W * 0.5} ${chaoY + chaoAltura * 0.46} T ${W} ${chaoY + chaoAltura * 0.42} L ${W} ${bodyBot} L 0 ${bodyBot} Z" fill="${escurecer(corIdade, 0.12)}"/>`;

  // confetes/estrelinhas no "céu" das faces (densidade padrão Alice)
  const estrela = (x: number, y: number, s: number, cor: string, op: number) =>
    `<path d="M0,-10 L2.9,-3.1 10,-3.1 4.5,1.8 6.5,9 0,4.9 -6.5,9 -4.5,1.8 -10,-3.1 -2.9,-3.1 Z" transform="translate(${x} ${y}) scale(${s})" fill="${cor}" opacity="${op}"/>`;
  const bolinha = (x: number, y: number, r: number, cor: string, op: number) =>
    `<circle cx="${x}" cy="${y}" r="${r}" fill="${cor}" opacity="${op}"/>`;
  // máx. 3 elementos de céu por face, só no terço superior (estudo: 2-3 nuvens/estrelas; miolo respira)
  const nuvem = (x: number, y: number, s: number) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF" opacity="0.9"><ellipse rx="26" ry="15"/><ellipse cx="-20" cy="5" rx="16" ry="10"/><ellipse cx="20" cy="5" rx="17" ry="11"/></g>`;
  const salpicos = big
    .map((f, i) => {
      const seed = (i + 1) * 7;
      const px = (k: number) => f.x + f.w * ((((seed * (k + 3)) % 74) + 13) / 100);
      const py = (k: number) => f.y + (chaoY - f.y) * ((((seed * (k + 7)) % 27) + 6) / 100);
      return (
        nuvem(px(1), py(1), 1.15) +
        estrela(px(2), py(2), 1.3, "#FFFFFF", 0.75) +
        bolinha(px(3), py(3), 6, corNome, 0.4)
      );
    })
    .join("");

  // ---- personagem grande ancorado no chão (efeito adesivo) ----
  const personagensBase = d.personagens?.length
    ? d.personagens
    : [d.principal, d.amigo, d.amigo2].filter(Boolean) as ClipartDados[];
  const personagens = personagensBase.filter(
    (img, index, list) => list.findIndex((candidate) => candidate.uri === img.uri) === index,
  );
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
    if (aw > f.w * 0.92) { aw = f.w * 0.92; ah = aw / ratio; }
    const cx = f.cx;
    const base = baseOverride ?? bodyBot - chaoAltura * 0.12;
    const imagem = `<image href="${img.uri}" xlink:href="${img.uri}" x="${cx - aw / 2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet" filter="url(#adesivo)"/>`;
    // repetição do mesmo personagem em outra face: espelha p/ dar variedade
    return espelhar ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${imagem}</g>` : imagem;
  };

  const themedAccentBlock = (f: Face, compact = false) => {
    const size = Math.min(f.w * (compact ? 0.34 : 0.48), f.h * (compact ? 0.25 : 0.36));
    const cx = f.cx;
    const cy = compact ? f.y + f.h * 0.43 : f.y + f.h * 0.48;
    const fill = d.papelTopUri ? "url(#papelTop)" : clarear(corIdade, 0.65);
    return `<g data-theme-accent="true">
      <ellipse cx="${cx}" cy="${cy}" rx="${size * 0.58}" ry="${size * 0.46}" fill="#FFFFFF" fill-opacity="0.88" stroke="${corNome}" stroke-width="${Math.max(2, size * 0.035)}"/>
      <circle cx="${cx}" cy="${cy}" r="${size * 0.32}" fill="${fill}" stroke="#FFFFFF" stroke-width="${Math.max(2, size * 0.025)}"/>
      ${estrela(cx, cy, size * 0.018, corAcento, 0.92)}
      ${bolinha(cx - size * 0.42, cy - size * 0.28, size * 0.045, corIdade, 0.78)}
      ${bolinha(cx + size * 0.40, cy + size * 0.24, size * 0.035, corNome, 0.68)}
    </g>`;
  };

  // ---- plaquinha de nome com contraste forte ----
  // estudo Alice: largura mediana 58% da face, encostada na linha do chão
  // (o personagem pode sobrepor a placa — assinatura dos kits reais)
  const plateBlock = (f: Face) => {
    // texto sempre legível: cores de tema claras são escurecidas na plaquinha
    const corTexto = luminancia(corNome) > 0.6 ? escurecer(corNome, 0.45) : corNome;
    const nameWidth = isMilk ? qualityStandard.milkNamePlateWidth : qualityStandard.namePlateWidth;
    const plW = Math.min(
      f.w * (nameWidth.target / 100),
      avgFaceW * (nameWidth.max / 100),
    );
    const temPlaca = !!d.placaUri;
    const textoDireto = !temPlaca && !estampaDensa && !isMilk;
    const plH = temPlaca
      ? plW * ((d.placaMeta?.h || 202) / (d.placaMeta?.w || 320))
      : plW * (textoDireto ? 0.24 : 0.30);
    const cx = f.cx;
    const plY = isMilk
      ? bodyBot - plH - f.h * 0.035
      : compositionProfile === "modular"
      ? bodyBot - plH - f.h * 0.03
      : f.y + f.h - f.h * 0.14 - plH;
    const fundoPlaca = temPlaca
      ? `<image href="${d.placaUri}" xlink:href="${d.placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" preserveAspectRatio="xMidYMid meet"/>`
      : textoDireto
        ? ""
        : `<rect x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" rx="${plH * 0.48}" fill="#FFFFFF" fill-opacity="0.94" stroke="${corNome}" stroke-width="${Math.max(2, plW * 0.012)}"/>`;
    // nome ajustado à largura (nunca estoura a plaquinha)
    const fsNome = Math.min(plW * (isMilk ? 0.16 : 0.19), (plW * 0.8) / Math.max(3, nome.length) * 1.9);
    const nomeFit = nome.length > 10
      ? ` textLength="${plW * 0.78}" lengthAdjust="spacingAndGlyphs"`
      : "";
    const idadeLimpa = idade?.trim() || "";
    const fsIdade = fsNome * qualityStandard.ageToNameFontRatio.target;
    const idadeTxt = idadeLimpa
      ? `<text x="${cx}" y="${plY + plH * 0.73}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-weight="500" font-size="${fsIdade}" fill="${corTexto}" stroke="#FFFFFF" stroke-width="${fsIdade * qualityStandard.directTextHaloToFontSize}" paint-order="stroke">${esc(idadeLimpa)} ${/^\d+$/.test(idadeLimpa) ? "anos" : ""}</text>`
      : "";
    const nomeY = plY + plH * (idadeLimpa ? 0.40 : 0.52);
    return `${fundoPlaca}
    <text x="${cx}" y="${nomeY}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${fsNome}"${nomeFit} fill="${corTexto}" stroke="#FFFFFF" stroke-width="${fsNome * qualityStandard.directTextHaloToFontSize}" paint-order="stroke" font-weight="600">${esc(nome)}</text>
    ${idadeTxt}`;
  };

  // ---- distribuição: nome na face central; personagens grandes nas demais;
  // com 4+ faces grandes, uma fica de RESPIRO só com cenário (padrão A-B-A-C) ----
  const heroTarget = compositionProfile === "modular"
    ? qualityStandard.modularElementHeight.target / 100
    : qualityStandard.heroHeight.target / 100;
  let content = "";
  if (big.length === 1) {
    const f = big[0];
    content =
      (personagens[0] ? personagemBlock(personagens[0], { ...f, cx: f.x + f.w * 0.26 } as Face, heroTarget) : "") +
      plateBlock({ ...f, cx: f.x + f.w * 0.68 } as Face) +
      (personagens[1] ? personagemBlock(personagens[1], { ...f, cx: f.x + f.w * 0.88, w: f.w * 0.4 } as Face, 0.4) : "");
  } else {
    let idx = 0;
    content = big
      .map((f) => {
        if (milkNameFaces.includes(f) || f === nameFace) {
          if (compositionProfile === "modular" || personagens.length === 0) return plateBlock(f);
          const img = personagens[idx];
          idx++;
          const arteAcimaDoNome = img
            ? personagemBlock(img, f, 0.42, false, f.y + f.h * 0.70)
            : themedAccentBlock(f, true);
          return arteAcimaDoNome + plateBlock(f);
        }
        if (f === respiro && compositionProfile === "modular") return "";
        // A escala depende da linguagem visual escolhida para o papel.
        const img = personagens[idx] ?? null;
        idx++;
        return img
          ? personagemBlock(img, f, compositionProfile === "modular" ? heroTarget : qualityStandard.heroHeight.target / 100)
          : themedAccentBlock(f);
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
    ${paletteTint ? `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="${corAcento}" opacity="0.18"/>` : ""}
    ${fundoCorpo}
    ${paletteTint ? `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="${corFundo}" opacity="0.24"/>` : ""}
    ${salpicos}
    ${faixaChao}
    ${destaqueEstampa}
    ${content}
    <rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="#FFFFFF"/>
  </g>
  <g id="molde-tecnico" fill="#111111" stroke="#111111">${moldGeometry}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// IO do navegador
// ---------------------------------------------------------------------------
const textCache = new Map<string, Promise<string>>();
const dataUriCache = new Map<string, Promise<string>>();
const trimCache = new Map<string, Promise<{ uri: string; w: number; h: number }>>();

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

function trimTransparent(dataUri: string): Promise<{ uri: string; w: number; h: number }> {
  const cached = trimCache.get(dataUri);
  if (cached) return cached;
  const request = trimTransparentUncached(dataUri).catch((error) => {
    trimCache.delete(dataUri);
    throw error;
  });
  trimCache.set(dataUri, request);
  return request;
}

async function trimTransparentUncached(dataUri: string): Promise<{ uri: string; w: number; h: number }> {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = dataUri; });
  const cv = document.createElement("canvas");
  cv.width = img.naturalWidth; cv.height = img.naturalHeight;
  const cx = cv.getContext("2d")!;
  cx.drawImage(img, 0, 0);
  const d = cx.getImageData(0, 0, cv.width, cv.height).data;
  let minX = cv.width, minY = cv.height, maxX = 0, maxY = 0;
  for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
    if (d[(y * cv.width + x) * 4 + 3] > 12) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX) return { uri: dataUri, w: cv.width, h: cv.height };
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.03);
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(cv.width - 1, maxX + pad); maxY = Math.min(cv.height - 1, maxY + pad);
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  out.getContext("2d")!.drawImage(cv, minX, minY, w, h, 0, 0, w, h);
  return { uri: out.toDataURL("image/png"), w, h };
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

export async function composeKit({ molde, assets, nome, idade, palette }: ComposeInput): Promise<string> {
  const byRole = (role: string) => assets.find((a) => a.role === role);
  const fonte = assets.find((a) => a.kind === "fonte");
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
    .filter((asset) => asset.kind === "clipart" && asset.url)
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
    personagens: personagens.map(({ uri, w, h }) => ({ uri, w, h })),
    placaUri,
    placaMeta: placa?.meta ?? null,
    fonteFamily: fonte?.meta?.family || "sans-serif",
    fonteUri,
    corNome: palette?.primary || fonte?.meta?.cor || "#7A2FB0",
    corIdade: palette?.secondary || fonte?.meta?.cor2 || "#1BA67C",
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
