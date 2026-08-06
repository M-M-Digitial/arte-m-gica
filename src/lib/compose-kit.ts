// compose-kit — motor do padrão Alice: biblioteca de temas + molde vetorial +
// nome → arte SVG editável. O layout é PURO (montarSvgKit) para rodar igual no
// navegador e no harness de prévia (tools/ingestao/preview-kit.mjs).

import {
  ALICE_QUALITY_STANDARD,
  MARKET_VISUAL_RESEARCH,
} from "../../supabase/functions/_shared/alice-quality-standard.ts";
import { assertThemeReadyForComposition } from "./theme-curation";
import {
  selectPrintableFaces,
  toSafePrintableFace,
  type PrintableFace,
} from "./printable-faces";
export { adaptThemePalette, getDefaultThemePalette, getThemeHeroRole } from "./theme-palettes";

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
  appearance?: "balanced" | "vibrant" | "elegant";
}

export interface KitTypography {
  family?: string;
  scale?: number;
  useThemeFont?: boolean;
}

export interface ComposeInput {
  molde: MoldeCompose;
  assets: TemaAsset[];
  themeSlug?: string;
  nome: string;
  idade?: string;
  palette?: KitPalette;
  typography?: KitTypography;
}

type Face = PrintableFace;

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
  if ((asset.visibleCoverage ?? 1) < 0.24 && ratio >= 1.1) return "border";
  const explicitRole = normalizarId(asset.role);
  if (/^(principal|amigo2?|hero|personagem|secundario)$/.test(explicitRole)) return "hero";
  if ((asset.visibleCoverage ?? 0) >= 0.84 && ratio >= 1.1) return "panel";
  return "hero";
}

// Analise do papel do corpo para escolher a densidade e a escala dos elementos.
export interface PapelInfo { busy: boolean; corMedia: string }

export interface KitDados {
  moldName?: string;
  themeSlug?: string;
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
  paletteAppearance?: "balanced" | "vibrant" | "elegant";
  nome: string;
  idade?: string;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const escAttr = (s: string) => esc(s).replace(/'/g, "&apos;");

const technicalGeometrySelector = "path,line,polyline,polygon,rect,circle,ellipse";

// O SVG de origem pode repetir o contorno dentro de defs, máscaras e clipPaths.
// Essas cópias são auxiliares e não podem reaparecer como um segundo molde.
export function extractMoldGeometry(moldSvg: string): string {
  if (typeof DOMParser !== "undefined") {
    try {
      const document = new DOMParser().parseFromString(moldSvg, "image/svg+xml");
      const seen = new Set<string>();
      return Array.from(document.querySelectorAll(technicalGeometrySelector))
        .filter((node) => !node.closest("defs,clipPath,mask,symbol"))
        .map((node) => {
          const clone = node.cloneNode(true) as Element;
          clone.removeAttribute("id");
          clone.removeAttribute("class");
          for (const attribute of Array.from(clone.attributes)) {
            if (/^on/i.test(attribute.name) || /href/i.test(attribute.name)) clone.removeAttribute(attribute.name);
          }
          return clone.outerHTML;
        })
        .filter((markup) => {
          const key = markup.replace(/\s+/g, " ").trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .join("\n");
    } catch {
      // Usa a extração textual sanitizada em ambientes sem DOM completo.
    }
  }

  const visibleSvg = moldSvg.replace(/<(defs|clipPath|mask|symbol)\b[\s\S]*?<\/\1>/gi, "");
  const seen = new Set<string>();
  return Array.from(visibleSvg.matchAll(/<(?:path|line|polyline|polygon|rect|circle|ellipse)\b[^>]*?(?:\/>|>)/gi))
    .map(([markup]) => markup.replace(/\s(?:id|class)=("[^"]*"|'[^']*')/gi, ""))
    .filter((markup) => {
      const key = markup.replace(/\s+/g, " ").trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
}

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

const luminanciaRelativa = (hex: string) => {
  const value = hex.replace("#", "");
  if (!/^[0-9a-f]{6}$/i.test(value)) return 0;
  const channel = (offset: number) => {
    const srgb = parseInt(value.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
};

const contrasteComBranco = (hex: string) => 1.05 / (luminanciaRelativa(hex) + 0.05);

const garantirContrasteNoClaro = (hex: string, minimo = 4.5) => {
  let result = hex;
  for (let attempt = 0; attempt < 8 && contrasteComBranco(result) < minimo; attempt++) {
    result = escurecer(result, 0.14);
  }
  return result;
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

export type ThemeSceneFamily =
  | "fairytale"
  | "safari"
  | "ocean"
  | "ice"
  | "space"
  | "vehicles"
  | "garden"
  | "circus"
  | "heroic"
  | "generic";

export function getThemeSceneFamily(themeSlug?: string): ThemeSceneFamily {
  const slug = normalizarId(themeSlug);
  if (/bela.*fera|princes|sofia|rapunzel|cinderela|branca.*neve|encanto|fada|castelo|barbie/.test(slug)) return "fairytale";
  if (/safari|floresta|selva|bichinhos|arca.*noe|fazendinha|dinossaur/.test(slug)) return "safari";
  if (/sereia|moana|fundo.*mar|baby.*shark|oceano|peixe/.test(slug)) return "ocean";
  if (/era.*gelo|frozen|neve/.test(slug)) return "ice";
  if (/astronauta|espaco|universo|foguete/.test(slug)) return "space";
  if (/carro|hot.*wheel|blaze|corrida/.test(slug)) return "vehicles";
  if (/jardim|floral|borboleta|abelh|unicornio|bosque|moranguinho/.test(slug)) return "garden";
  if (/circo|arraial|festa.*junina|mundo.*bita/.test(slug)) return "circus";
  if (/heroi|vingador|batman|aranha|dragon|naruto|minecraft|angry/.test(slug)) return "heroic";
  return "generic";
}

// ---------------------------------------------------------------------------
// LAYOUT PURO — "Padrão Alice": papel na escala certa, personagem grande
// ancorado no chão, faixa de cenário, plaquinha de nome com contraste.
// ---------------------------------------------------------------------------
export function montarSvgKit(d: KitDados): string {
  const { nome, idade, corNome, corIdade } = d;
  const corFundo = d.corFundo || "#CDEFFB";
  const corAcento = d.corAcento || corNome;
  const paletteTint = Boolean(d.corFundo || d.corAcento);
  const paletteAppearance = d.paletteAppearance ?? "balanced";
  const isVibrant = paletteAppearance === "vibrant";
  const isElegant = paletteAppearance === "elegant";
  const compositionColors = [corNome, corIdade, corAcento, corFundo];
  const indexedColor = (index: number) => compositionColors[Math.abs(index) % compositionColors.length];
  const qualityStandard = ALICE_QUALITY_STANDARD.layout;
  const family = d.fonteFamily || "sans-serif";
  const familyAttr = escAttr(family);
  const isMilk = normalizarId(d.moldName).includes("caixa milk");
  const isPyramid = normalizarId(d.moldName).includes("piramide");

  const vb = d.moldSvg.match(/viewBox="([^"]+)"/);
  if (!vb) throw new Error("Molde SVG sem viewBox");
  const [, , W, H] = vb[1].split(/\s+/).map(Number);
  const moldGeometry = extractMoldGeometry(d.moldSvg);
  const { faces } = JSON.parse(d.facesJson) as { faces: Face[] };

  // ---- zonas ----
  const structuralFaces = selectPrintableFaces(faces, W, H, d.moldName);
  if (!structuralFaces.length) throw new Error("Molde sem faces imprimiveis validas");
  const pyramidApex = { x: W * 0.845, y: H * 0.16 };
  const big = structuralFaces.map((face) => {
    const safeFace = toSafePrintableFace(face);
    if (!isPyramid) return safeFace;

    let width = safeFace.w;
    let height = safeFace.h;
    let rotation = Number.isFinite(safeFace.safeRotation) ? safeFace.safeRotation! : 0;
    if (width > height * 1.25) {
      [width, height] = [height, width];
      rotation += 90;
    }
    // A deteccao conservadora encontra o eixo central do triangulo. Expandimos
    // apenas na largura e reduzimos a altura para aproveitar a base sem tocar
    // nas arestas inclinadas ou atravessar os vincos.
    width = width < height * 0.72
      ? Math.min(width * 1.34, height * 0.68)
      : width * 0.94;
    height *= 0.90;
    const upX = Math.sin(rotation * Math.PI / 180);
    const upY = -Math.cos(rotation * Math.PI / 180);
    const towardApexX = pyramidApex.x - safeFace.cx;
    const towardApexY = pyramidApex.y - safeFace.cy;
    if (upX * towardApexX + upY * towardApexY < 0) rotation += 180;
    return {
      ...safeFace,
      x: safeFace.cx - width / 2,
      y: safeFace.cy - height / 2,
      w: width,
      h: height,
      area: width * height,
      safeRotation: rotation,
    };
  });
  const bodyTop = Math.min(...structuralFaces.map((f) => f.y));
  const bodyBot = Math.max(...structuralFaces.map((f) => f.y + f.h));
  const namePlateWidthRatio = qualityStandard.namePlateWidth.target / 100;
  const plateAspectRatio = (d.placaMeta?.h || 202) / (d.placaMeta?.w || 320);
  const fallbackPlateAspectRatio = 0.42;
  const nameFaceCapacity = big.map((face) => ({
    face,
    width: face.w * namePlateWidthRatio,
    height: d.placaUri
      ? Math.min(face.h * 0.32, face.w * namePlateWidthRatio * plateAspectRatio)
      : Math.min(face.h * 0.32, face.w * namePlateWidthRatio * fallbackPlateAspectRatio),
  }));
  const maxPlateWidth = Math.max(...nameFaceCapacity.map((candidate) => candidate.width));
  const maxPlateHeight = Math.max(...nameFaceCapacity.map((candidate) => candidate.height));
  const defaultNameFace = big
    .slice()
    .sort((a, b) => {
      const centralityA = 1 - Math.min(1, Math.abs(a.cx - W / 2) / (W / 2));
      const centralityB = 1 - Math.min(1, Math.abs(b.cx - W / 2) / (W / 2));
      const capacityA = nameFaceCapacity.find((candidate) => candidate.face === a)!;
      const capacityB = nameFaceCapacity.find((candidate) => candidate.face === b)!;
      const scoreA = (capacityA.height / maxPlateHeight) * 0.62
        + (capacityA.width / maxPlateWidth) * 0.23
        + centralityA * 0.15;
      const scoreB = (capacityB.height / maxPlateHeight) * 0.62
        + (capacityB.width / maxPlateWidth) * 0.23
        + centralityB * 0.15;
      return scoreB - scoreA;
    })[0];
  const hasMilkPanels = isMilk && big.length >= 4;
  const milkNameFaces = hasMilkPanels ? [big[0], big[big.length - 1]] : [];
  const frontFace = hasMilkPanels ? big[1] : undefined;
  const backFace = hasMilkPanels ? big[2] : undefined;
  const nameFace = milkNameFaces[0] ?? defaultNameFace;
  const avgFaceW = big.reduce((s, f) => s + f.w, 0) / big.length;
  const avgFaceH = big.reduce((s, f) => s + f.h, 0) / big.length;
  const isSingleWideFace = big.length === 1 && big[0].w / big[0].h >= 1.28;

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
  const faceRole = (face: Face) => {
    if (face === frontFace) return "front";
    if (milkNameFaces.includes(face)) return "side";
    if (face === backFace) return "back";
    if (face === nameFace) return "personalization";
    return "standard";
  };
  const faceIndexFor = (face: Face) => {
    const direct = big.indexOf(face);
    if (direct >= 0) return direct;
    if (big.length === 1) return 0;
    return big.findIndex((candidate) => face.cx >= candidate.x && face.cx <= candidate.x + candidate.w);
  };
  const faceOrientationAttributes = (face: Face) => {
    const rotation = Number.isFinite(face.safeRotation) ? face.safeRotation! : 0;
    return Math.abs(rotation % 360) > 0.01
      ? ` data-face-orientation="${rotation}" transform="rotate(${rotation} ${face.cx} ${face.cy})"`
      : "";
  };
  const milkHeroes = new Map<Face, ClipartDados>();
  if (hasMilkPanels && orderedHeroes.length) {
    const assignHero = (face: Face, index: number) => {
      const hero = orderedHeroes[index];
      if (hero) milkHeroes.set(face, hero);
    };
    assignHero(big[0], 1);
    assignHero(big[1], 0);
    assignHero(big[2], 2);
    assignHero(big[big.length - 1], 3);
  }

  const safe = qualityStandard.stickerSafeInset;
  const faceSafeClipPaths = big.map((face, index) => {
    const x = face.x + face.w * safe.horizontal;
    const y = face.y + face.h * safe.top;
    const width = face.w * (1 - safe.horizontal * 2);
    const height = face.h * (1 - safe.top - safe.bottom);
    const rotation = Number.isFinite(face.safeRotation) ? face.safeRotation! : 0;
    const transform = Math.abs(rotation % 360) > 0.01
      ? ` transform="rotate(${rotation} ${face.cx} ${face.cy})"`
      : "";
    return `<clipPath id="face-safe-${index}"><rect x="${x}" y="${y}" width="${width}" height="${height}"${transform}/></clipPath>`;
  }).join("\n    ");
  const faceSafeClip = (face: Face) => {
    const index = big.indexOf(face);
    return index >= 0 ? ` clip-path="url(#face-safe-${index})"` : "";
  };

  // ---- fundo: papel em ESCALA DE MOTIVO (pattern), não imagem esticada ----
  // o spec fala do MOTIVO interno (~8% da face); cada arquivo de papel já traz
  // uma grade de ~6-8 motivos, então o tile certo é ~metade da face no corpo
  // e mais fino nas abas (lê como textura)
  const motCorpo = Math.max(180, avgFaceW * (estampaDensa ? 0.92 : 0.58));
  const motTopo = Math.max(120, avgFaceW * (estampaDensa ? 0.68 : 0.40));
  const defsPapel: string[] = [];
  let fundoTopo = "";
  let fundoBase = "";
  let fundoCorpo = "";
  if (d.papelTopUri) {
    defsPapel.push(
      `<pattern id="papelTop" patternUnits="userSpaceOnUse" width="${motTopo}" height="${motTopo}"><image href="${d.papelTopUri}" x="0" y="0" width="${motTopo}" height="${motTopo}" preserveAspectRatio="xMidYMid slice"/></pattern>`
    );
    fundoTopo = paletteTint
      ? `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="${corNome}"/><rect x="0" y="0" width="${W}" height="${bodyTop}" fill="url(#papelTop)" opacity="${isVibrant ? "0.30" : isElegant ? "0.38" : estampaDensa ? "0.34" : "0.44"}"/>`
      : `<rect x="0" y="0" width="${W}" height="${bodyTop}" fill="url(#papelTop)"/>`;
    fundoBase = paletteTint
      ? `<rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="${corNome}"/><rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="url(#papelTop)" opacity="${isVibrant ? 0.28 : isElegant ? 0.36 : estampaDensa ? 0.32 : 0.42}"/>`
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
      ? `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="${corFundo}"/><rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#papelBody)" opacity="${isVibrant ? 0.36 : isElegant ? 0.46 : estampaDensa ? 0.40 : 0.54}"/>`
      : `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#papelBody)"/>`;
  } else {
    fundoCorpo = `<rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#ceu)"/>`;
  }

  const firstBodyFace = structuralFaces[0];
  const lastBodyFace = structuralFaces[structuralFaces.length - 1];
  const bodyRowX = firstBodyFace?.x ?? 0;
  const bodyRowW = firstBodyFace && lastBodyFace
    ? lastBodyFace.x + lastBodyFace.w - firstBodyFace.x
    : W;
  const panoramicScene = panelAssets[0]
    ? `<image data-theme-scene="panoramic" data-scene-continuity="licensed-panel" href="${panelAssets[0].uri}" xlink:href="${panelAssets[0].uri}" x="${bodyRowX}" y="${bodyTop}" width="${bodyRowW}" height="${bodyBot - bodyTop}" preserveAspectRatio="xMidYMax slice" opacity="${isVibrant ? 0.50 : isElegant ? 0.60 : 0.72}"/>`
    : "";
  const vibrantColorLayer = isVibrant
    ? `<g data-vibrant-color-wash="true" data-scene-continuity="party-color-rhythm">
        <rect x="${bodyRowX}" y="${bodyTop}" width="${bodyRowW}" height="${bodyBot - bodyTop}" fill="${corFundo}" fill-opacity="0.18"/>
        <path d="M ${bodyRowX} ${bodyTop + avgFaceH * 0.13} Q ${bodyRowX + bodyRowW * 0.25} ${bodyTop - avgFaceH * 0.04} ${bodyRowX + bodyRowW * 0.50} ${bodyTop + avgFaceH * 0.14} T ${bodyRowX + bodyRowW} ${bodyTop + avgFaceH * 0.12} L ${bodyRowX + bodyRowW} ${bodyTop} H ${bodyRowX} Z" fill="${corIdade}" fill-opacity="0.46"/>
        <path d="M ${bodyRowX} ${bodyBot - avgFaceH * 0.32} Q ${bodyRowX + bodyRowW * 0.18} ${bodyBot - avgFaceH * 0.45} ${bodyRowX + bodyRowW * 0.38} ${bodyBot - avgFaceH * 0.28} T ${bodyRowX + bodyRowW * 0.76} ${bodyBot - avgFaceH * 0.31} T ${bodyRowX + bodyRowW} ${bodyBot - avgFaceH * 0.26} L ${bodyRowX + bodyRowW} ${bodyBot} H ${bodyRowX} Z" fill="${corAcento}" fill-opacity="0.42"/>
        <path d="M ${bodyRowX} ${bodyTop + avgFaceH * 0.53} C ${bodyRowX + bodyRowW * 0.24} ${bodyTop + avgFaceH * 0.45}, ${bodyRowX + bodyRowW * 0.71} ${bodyTop + avgFaceH * 0.62}, ${bodyRowX + bodyRowW} ${bodyTop + avgFaceH * 0.50}" fill="none" stroke="${corNome}" stroke-width="${Math.max(10, avgFaceH * 0.045)}" stroke-opacity="0.24"/>
        ${isPyramid ? "" : big.map((face, index) => `<ellipse cx="${face.cx}" cy="${face.y + face.h * 0.47}" rx="${face.w * 0.42}" ry="${face.h * 0.35}" fill="${index % 2 === 0 ? corIdade : corNome}" fill-opacity="${index % 2 === 0 ? 0.15 : 0.13}"/>`).join("")}
      </g>`
    : "";
  const elegantFinishLayer = isElegant
    ? `<g data-elegant-finish="true" data-scene-continuity="refined-linework">
        <rect x="${bodyRowX}" y="${bodyTop}" width="${bodyRowW}" height="${bodyBot - bodyTop}" fill="#FFFFFF" fill-opacity="0.12"/>
        <path d="M ${bodyRowX} ${bodyTop + avgFaceH * 0.045} H ${bodyRowX + bodyRowW}" stroke="${corIdade}" stroke-width="${Math.max(4, avgFaceH * 0.012)}" stroke-opacity="0.76"/>
        <path d="M ${bodyRowX} ${bodyBot - avgFaceH * 0.045} H ${bodyRowX + bodyRowW}" stroke="${corIdade}" stroke-width="${Math.max(3, avgFaceH * 0.009)}" stroke-opacity="0.58"/>
      </g>`
    : "";
  const sceneFamily = getThemeSceneFamily(d.themeSlug);
  const sceneLayer = (() => {
    const top = bodyTop;
    const height = bodyBot - bodyTop;
    const bottom = bodyBot;
    if (isPyramid) {
      const sceneStroke = Math.max(4, avgFaceH * 0.014);
      let pyramidMotif = "";
      if (sceneFamily === "fairytale" || sceneFamily === "garden") {
        const wreath = (wreathX: number, wreathY: number, scale: number) => `<g data-motif-kind="ornamental-wreath" transform="translate(${wreathX} ${wreathY}) scale(${scale})" fill="none" stroke="${corNome}" stroke-opacity="0.24" stroke-width="${sceneStroke}">
          <ellipse cx="0" cy="0" rx="${avgFaceW * 0.36}" ry="${avgFaceH * 0.29}"/>
          <path d="M -${avgFaceW * 0.31} ${avgFaceH * 0.08} Q -${avgFaceW * 0.12} -${avgFaceH * 0.31} 0 -${avgFaceH * 0.22} Q ${avgFaceW * 0.12} -${avgFaceH * 0.31} ${avgFaceW * 0.31} ${avgFaceH * 0.08}"/>
          <path d="M -${avgFaceW * 0.34} ${avgFaceH * 0.15} q ${avgFaceW * 0.11} ${avgFaceH * 0.12} ${avgFaceW * 0.22} 0 M ${avgFaceW * 0.34} ${avgFaceH * 0.15} q -${avgFaceW * 0.11} ${avgFaceH * 0.12} -${avgFaceW * 0.22} 0"/>
        </g>`;
        pyramidMotif = `${wreath(W * 0.25, H * 0.34, 1.05)}${wreath(W * 0.58, H * 0.25, 0.82)}${wreath(W * 0.78, H * 0.62, 1.08)}
          <g fill="${corAcento}" fill-opacity="0.24"><circle cx="${W * 0.18}" cy="${H * 0.64}" r="${avgFaceW * 0.09}"/><circle cx="${W * 0.24}" cy="${H * 0.60}" r="${avgFaceW * 0.07}"/><circle cx="${W * 0.84}" cy="${H * 0.28}" r="${avgFaceW * 0.08}"/></g>`;
      } else if (sceneFamily === "ice" || sceneFamily === "space") {
        const crystal = (crystalX: number, crystalY: number, scale: number) => `<g transform="translate(${crystalX} ${crystalY}) scale(${scale})" fill="none" stroke="#FFFFFF" stroke-opacity="0.38" stroke-width="${sceneStroke}" stroke-linecap="round"><path d="M -${avgFaceW * 0.18} 0 H ${avgFaceW * 0.18} M 0 -${avgFaceW * 0.18} V ${avgFaceW * 0.18} M -${avgFaceW * 0.13} -${avgFaceW * 0.13} L ${avgFaceW * 0.13} ${avgFaceW * 0.13} M -${avgFaceW * 0.13} ${avgFaceW * 0.13} L ${avgFaceW * 0.13} -${avgFaceW * 0.13}"/></g>`;
        pyramidMotif = `${crystal(W * 0.22, H * 0.32, 1.1)}${crystal(W * 0.55, H * 0.23, 0.72)}${crystal(W * 0.80, H * 0.58, 1.0)}
          <ellipse cx="${W * 0.58}" cy="${H * 0.45}" rx="${W * 0.25}" ry="${H * 0.11}" fill="none" stroke="${corAcento}" stroke-opacity="0.22" stroke-width="${sceneStroke}" transform="rotate(-18 ${W * 0.58} ${H * 0.45})"/>`;
      } else if (sceneFamily === "ocean") {
        pyramidMotif = `<path d="M 0 ${H * 0.48} Q ${W * 0.125} ${H * 0.37} ${W * 0.25} ${H * 0.48} T ${W * 0.50} ${H * 0.48} T ${W * 0.75} ${H * 0.48} T ${W} ${H * 0.48}" fill="none" stroke="#FFFFFF" stroke-opacity="0.46" stroke-width="${sceneStroke * 1.4}"/>
          <g fill="none" stroke="${corNome}" stroke-opacity="0.28" stroke-width="${sceneStroke}"><circle cx="${W * 0.22}" cy="${H * 0.26}" r="${avgFaceW * 0.12}"/><circle cx="${W * 0.62}" cy="${H * 0.22}" r="${avgFaceW * 0.08}"/><circle cx="${W * 0.82}" cy="${H * 0.63}" r="${avgFaceW * 0.15}"/></g>`;
      } else {
        pyramidMotif = `<path d="M ${W * 0.10} ${H * 0.16} L ${W * 0.88} ${H * 0.74} M ${W * 0.18} ${H * 0.76} L ${W * 0.84} ${H * 0.18}" stroke="#FFFFFF" stroke-opacity="0.18" stroke-width="${sceneStroke * 2.2}"/>
          <ellipse cx="${W * 0.48}" cy="${H * 0.45}" rx="${W * 0.34}" ry="${H * 0.25}" fill="${corAcento}" fill-opacity="0.10" stroke="${corNome}" stroke-opacity="0.20" stroke-width="${sceneStroke}"/>`;
      }
      return `<g data-scene-continuity="true" data-scene-template="pyramid-${sceneFamily}-fold-aware">
        <path d="M 0 ${H * 0.08} Q ${W * 0.45} ${H * 0.01} ${W} ${H * 0.12} L ${W} 0 H 0 Z" fill="${corIdade}" fill-opacity="${isVibrant ? 0.34 : 0.22}"/>
        <path d="M 0 ${H * 0.72} Q ${W * 0.28} ${H * 0.61} ${W * 0.53} ${H * 0.74} T ${W} ${H * 0.70} V ${H} H 0 Z" fill="${corAcento}" fill-opacity="${isVibrant ? 0.30 : 0.18}"/>
        <path d="M 0 ${H * 0.13} Q ${W * 0.45} ${H * 0.05} ${W} ${H * 0.16}" fill="none" stroke="#FFFFFF" stroke-opacity="0.58" stroke-width="${sceneStroke}"/>
        ${pyramidMotif}
      </g>`;
    }
    if (sceneFamily === "fairytale") {
      const arches = big.map((f, index) => {
        const inset = f.w * 0.11;
        const archTop = f.y + f.h * (index % 2 === 0 ? 0.16 : 0.12);
        const shoulder = f.y + f.h * 0.43;
        return `<path d="M ${f.x + inset} ${bottom} L ${f.x + inset} ${shoulder} A ${f.w * 0.39} ${f.h * 0.31} 0 0 1 ${f.x + f.w - inset} ${shoulder} L ${f.x + f.w - inset} ${bottom} Z" fill="#FFFDF5" fill-opacity="0.13" stroke="${corNome}" stroke-opacity="0.16" stroke-width="${Math.max(3, f.w * 0.012)}"/>
          <path d="M ${f.cx} ${archTop} V ${bottom - f.h * 0.18}" stroke="${corIdade}" stroke-opacity="0.16" stroke-width="${Math.max(2, f.w * 0.008)}"/>`;
      }).join("");
      return `<g data-scene-continuity="true" data-scene-template="fairytale-ballroom">
        <rect x="${bodyRowX}" y="${top}" width="${bodyRowW}" height="${height}" fill="${corIdade}" fill-opacity="0.055"/>
        ${arches}
        <path d="M ${bodyRowX} ${bottom - height * 0.16} H ${bodyRowX + bodyRowW}" stroke="${corNome}" stroke-opacity="0.17" stroke-width="${Math.max(4, avgFaceH * 0.018)}"/>
      </g>`;
    }
    if (sceneFamily === "safari") {
      const trees = big.filter((_, index) => index % 2 === 0).map((f) => `<g fill="${corNome}" fill-opacity="0.10">
        <path d="M ${f.x + f.w * 0.17} ${bottom - height * 0.17} L ${f.x + f.w * 0.20} ${top + height * 0.43} L ${f.x + f.w * 0.23} ${bottom - height * 0.17} Z"/>
        <ellipse cx="${f.x + f.w * 0.20}" cy="${top + height * 0.40}" rx="${f.w * 0.23}" ry="${height * 0.075}"/>
      </g>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="savanna">
        <path d="M ${bodyRowX} ${top + height * 0.62} C ${bodyRowX + bodyRowW * 0.18} ${top + height * 0.48}, ${bodyRowX + bodyRowW * 0.32} ${top + height * 0.71}, ${bodyRowX + bodyRowW * 0.50} ${top + height * 0.58} S ${bodyRowX + bodyRowW * 0.82} ${top + height * 0.48}, ${bodyRowX + bodyRowW} ${top + height * 0.64} L ${bodyRowX + bodyRowW} ${bottom} H ${bodyRowX} Z" fill="${corIdade}" fill-opacity="0.11"/>
        ${trees}
      </g>`;
    }
    if (sceneFamily === "ocean") {
      return `<g data-scene-continuity="true" data-scene-template="ocean-waves">
        <path d="M ${bodyRowX} ${bottom - height * 0.27} Q ${bodyRowX + bodyRowW * 0.125} ${bottom - height * 0.38} ${bodyRowX + bodyRowW * 0.25} ${bottom - height * 0.27} T ${bodyRowX + bodyRowW * 0.50} ${bottom - height * 0.27} T ${bodyRowX + bodyRowW * 0.75} ${bottom - height * 0.27} T ${bodyRowX + bodyRowW} ${bottom - height * 0.27} V ${bottom} H ${bodyRowX} Z" fill="${corNome}" fill-opacity="0.10"/>
        <path d="M ${bodyRowX} ${bottom - height * 0.19} Q ${bodyRowX + bodyRowW * 0.10} ${bottom - height * 0.27} ${bodyRowX + bodyRowW * 0.20} ${bottom - height * 0.19} T ${bodyRowX + bodyRowW * 0.40} ${bottom - height * 0.19} T ${bodyRowX + bodyRowW * 0.60} ${bottom - height * 0.19} T ${bodyRowX + bodyRowW * 0.80} ${bottom - height * 0.19} T ${bodyRowX + bodyRowW} ${bottom - height * 0.19}" fill="none" stroke="#FFFFFF" stroke-opacity="0.54" stroke-width="${Math.max(3, avgFaceH * 0.014)}"/>
      </g>`;
    }
    if (sceneFamily === "ice") {
      const mountains = big.map((f, index) => `<path d="M ${f.x - f.w * 0.06} ${bottom - height * 0.13} L ${f.x + f.w * 0.28} ${top + height * (index % 2 === 0 ? 0.22 : 0.30)} L ${f.x + f.w * 0.53} ${bottom - height * 0.17} L ${f.x + f.w * 0.76} ${top + height * 0.34} L ${f.x + f.w * 1.05} ${bottom - height * 0.13} Z" fill="#FFFFFF" fill-opacity="0.22" stroke="${corNome}" stroke-opacity="0.10" stroke-width="${Math.max(2, f.w * 0.008)}"/>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="ice-valley">${mountains}<path d="M ${bodyRowX} ${bottom - height * 0.16} Q ${bodyRowX + bodyRowW * 0.25} ${bottom - height * 0.25} ${bodyRowX + bodyRowW * 0.50} ${bottom - height * 0.16} T ${bodyRowX + bodyRowW} ${bottom - height * 0.16} V ${bottom} H ${bodyRowX} Z" fill="#FFFFFF" fill-opacity="0.30"/></g>`;
    }
    if (sceneFamily === "space") {
      const planets = big.map((f, index) => `<circle cx="${f.x + f.w * (index % 2 === 0 ? 0.22 : 0.78)}" cy="${top + height * (index % 2 === 0 ? 0.22 : 0.30)}" r="${Math.min(f.w, f.h) * (index % 3 === 0 ? 0.10 : 0.06)}" fill="${index % 2 === 0 ? corIdade : corAcento}" fill-opacity="0.22" stroke="#FFFFFF" stroke-opacity="0.46" stroke-width="${Math.max(2, f.w * 0.008)}"/>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="space-orbit">${planets}<path d="M ${bodyRowX} ${bottom - height * 0.13} C ${bodyRowX + bodyRowW * 0.25} ${bottom - height * 0.22}, ${bodyRowX + bodyRowW * 0.75} ${bottom - height * 0.22}, ${bodyRowX + bodyRowW} ${bottom - height * 0.13}" fill="none" stroke="#FFFFFF" stroke-opacity="0.32" stroke-width="${Math.max(3, avgFaceH * 0.014)}"/></g>`;
    }
    if (sceneFamily === "vehicles") {
      return `<g data-scene-continuity="true" data-scene-template="race-track"><path d="M ${bodyRowX} ${bottom - height * 0.28} H ${bodyRowX + bodyRowW} V ${bottom} H ${bodyRowX} Z" fill="${escurecer(corNome, 0.32)}" fill-opacity="0.18"/><path d="M ${bodyRowX} ${bottom - height * 0.14} H ${bodyRowX + bodyRowW}" stroke="#FFFFFF" stroke-opacity="0.66" stroke-width="${Math.max(4, avgFaceH * 0.02)}" stroke-dasharray="${avgFaceW * 0.16} ${avgFaceW * 0.10}"/></g>`;
    }
    if (sceneFamily === "garden") {
      const leaves = big.map((f, index) => `<g fill="${corNome}" fill-opacity="0.10" transform="translate(${f.x + f.w * (index % 2 === 0 ? 0.12 : 0.88)} ${top + height * 0.14}) rotate(${index % 2 === 0 ? -24 : 24})"><ellipse cx="0" cy="0" rx="${f.w * 0.10}" ry="${height * 0.035}"/><ellipse cx="${f.w * 0.09}" cy="${height * 0.05}" rx="${f.w * 0.09}" ry="${height * 0.032}"/></g>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="enchanted-garden">${leaves}<path d="M ${bodyRowX} ${bottom - height * 0.13} Q ${bodyRowX + bodyRowW * 0.25} ${bottom - height * 0.23} ${bodyRowX + bodyRowW * 0.50} ${bottom - height * 0.13} T ${bodyRowX + bodyRowW} ${bottom - height * 0.13}" fill="none" stroke="${corNome}" stroke-opacity="0.16" stroke-width="${Math.max(4, avgFaceH * 0.018)}"/></g>`;
    }
    if (sceneFamily === "circus") {
      const rays = big.map((f, index) => `<path d="M ${f.cx} ${top + height * 0.16} L ${f.x} ${bottom} H ${f.x + f.w} Z" fill="${index % 2 === 0 ? corIdade : corAcento}" fill-opacity="0.055"/>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="celebration-tent">${rays}<path d="M ${bodyRowX} ${top + height * 0.13} Q ${bodyRowX + bodyRowW * 0.125} ${top + height * 0.23} ${bodyRowX + bodyRowW * 0.25} ${top + height * 0.13} T ${bodyRowX + bodyRowW * 0.50} ${top + height * 0.13} T ${bodyRowX + bodyRowW * 0.75} ${top + height * 0.13} T ${bodyRowX + bodyRowW} ${top + height * 0.13}" fill="none" stroke="${corNome}" stroke-opacity="0.18" stroke-width="${Math.max(3, avgFaceH * 0.014)}"/></g>`;
    }
    if (sceneFamily === "heroic") {
      const panels = big.map((f, index) => `<path d="M ${f.x} ${bottom} L ${f.cx} ${top + height * 0.12} L ${f.x + f.w} ${bottom} Z" fill="${index % 2 === 0 ? corNome : corAcento}" fill-opacity="0.07"/>`).join("");
      return `<g data-scene-continuity="true" data-scene-template="heroic-rays">${panels}<path d="M ${bodyRowX} ${bottom - height * 0.12} H ${bodyRowX + bodyRowW}" stroke="${corIdade}" stroke-opacity="0.42" stroke-width="${Math.max(4, avgFaceH * 0.02)}"/></g>`;
    }
    return `<g data-scene-continuity="true" data-scene-template="layered-stage"><rect x="${bodyRowX}" y="${top}" width="${bodyRowW}" height="${height}" fill="${corAcento}" fill-opacity="0.14"/><path d="M ${bodyRowX} ${bottom - height * 0.14} Q ${bodyRowX + bodyRowW * 0.25} ${bottom - height * 0.21} ${bodyRowX + bodyRowW * 0.50} ${bottom - height * 0.14} T ${bodyRowX + bodyRowW} ${bottom - height * 0.14} V ${bottom} H ${bodyRowX} Z" fill="${corIdade}" fill-opacity="0.18"/></g>`;
  })();

  const faceDetailBlock = (f: Face, index: number) => {
    const insetX = f.w * 0.075;
    const insetY = f.h * 0.085;
    const x = f.x + insetX;
    const y = f.y + insetY;
    const w = f.w - insetX * 2;
    const h = f.h - insetY * 2;
    const x2 = x + w;
    const y2 = y + h;
    const cx = f.cx;
    const base = indexedColor(index);
    const support = indexedColor(index + 1);
    const accent = indexedColor(index + 2);
    const line = Math.max(2, Math.min(f.w, f.h) * 0.012);
    const dot = Math.max(3, Math.min(f.w, f.h) * 0.035);
    const frame = `<rect data-palette-area="true" x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.10}" fill="${clarear(base, isVibrant ? 0.56 : isElegant ? 0.82 : 0.70)}" fill-opacity="${isVibrant ? 0.62 : isElegant ? 0.48 : 0.54}" stroke="#FFFFFF" stroke-opacity="0.92" stroke-width="${line * 1.65}"/>
      <rect x="${x + line * 2.1}" y="${y + line * 2.1}" width="${Math.max(1, w - line * 4.2)}" height="${Math.max(1, h - line * 4.2)}" rx="${Math.min(w, h) * 0.08}" fill="none" stroke="${support}" stroke-opacity="${isElegant ? 0.48 : 0.68}" stroke-width="${line}"/>`;
    let motif = "";

    if (sceneFamily === "fairytale") {
      const rose = (roseX: number, roseY: number, mirror = 1) => `<g data-motif-kind="rose" transform="translate(${roseX} ${roseY}) scale(${mirror} 1)">
        <ellipse cx="${dot * 1.7}" cy="${dot * 0.2}" rx="${dot * 1.55}" ry="${dot * 0.58}" transform="rotate(-32 ${dot * 1.7} ${dot * 0.2})" fill="${corAcento}" fill-opacity="0.62"/>
        <ellipse cx="${dot * 0.75}" cy="${dot * 0.95}" rx="${dot * 1.25}" ry="${dot * 0.52}" transform="rotate(28 ${dot * 0.75} ${dot * 0.95})" fill="${support}" fill-opacity="0.56"/>
        <circle cx="0" cy="0" r="${dot * 1.18}" fill="${accent}" stroke="#FFFFFF" stroke-width="${line * 0.7}"/>
        <circle cx="${dot * 0.23}" cy="-${dot * 0.12}" r="${dot * 0.60}" fill="${clarear(accent, 0.30)}"/>
      </g>`;
      motif = `<path d="M ${x + w * 0.12} ${y2} V ${y + h * 0.42} A ${w * 0.38} ${h * 0.34} 0 0 1 ${x2 - w * 0.12} ${y + h * 0.42} V ${y2}" fill="#FFFDF8" fill-opacity="0.28" stroke="${corIdade}" stroke-opacity="0.72" stroke-width="${line * 1.25}"/>
        <path d="M ${x + w * 0.17} ${y + h * 0.18} Q ${cx} ${y + h * 0.04} ${x2 - w * 0.17} ${y + h * 0.18}" fill="none" stroke="${corAcento}" stroke-width="${line * 1.35}" stroke-linecap="round"/>
        ${rose(x + w * 0.13, y + h * 0.17)}${rose(x2 - w * 0.13, y + h * 0.17, -1)}`;
    } else if (sceneFamily === "safari") {
      motif = `<circle cx="${x2 - w * 0.18}" cy="${y + h * 0.18}" r="${dot * 1.55}" fill="${corIdade}" fill-opacity="0.78" stroke="#FFFFFF" stroke-width="${line}"/>
        <path d="M ${x} ${y2 - h * 0.23} Q ${x + w * 0.24} ${y2 - h * 0.40} ${x + w * 0.49} ${y2 - h * 0.24} T ${x2} ${y2 - h * 0.26} V ${y2} H ${x} Z" fill="${support}" fill-opacity="0.42"/>
        <g fill="${base}" fill-opacity="0.66"><ellipse cx="${x + w * 0.12}" cy="${y + h * 0.20}" rx="${dot * 1.7}" ry="${dot * 0.64}" transform="rotate(-42 ${x + w * 0.12} ${y + h * 0.20})"/><ellipse cx="${x + w * 0.20}" cy="${y + h * 0.13}" rx="${dot * 1.55}" ry="${dot * 0.58}" transform="rotate(28 ${x + w * 0.20} ${y + h * 0.13})"/><ellipse cx="${x2 - w * 0.12}" cy="${y2 - h * 0.13}" rx="${dot * 1.6}" ry="${dot * 0.60}" transform="rotate(38 ${x2 - w * 0.12} ${y2 - h * 0.13})"/></g>`;
    } else if (sceneFamily === "ocean") {
      motif = `<path d="M ${x} ${y2 - h * 0.24} Q ${x + w * 0.125} ${y2 - h * 0.36} ${x + w * 0.25} ${y2 - h * 0.24} T ${x + w * 0.50} ${y2 - h * 0.24} T ${x + w * 0.75} ${y2 - h * 0.24} T ${x2} ${y2 - h * 0.24} V ${y2} H ${x} Z" fill="${base}" fill-opacity="0.42"/>
        <path d="M ${x} ${y2 - h * 0.16} Q ${x + w * 0.10} ${y2 - h * 0.24} ${x + w * 0.20} ${y2 - h * 0.16} T ${x + w * 0.40} ${y2 - h * 0.16} T ${x + w * 0.60} ${y2 - h * 0.16} T ${x + w * 0.80} ${y2 - h * 0.16} T ${x2} ${y2 - h * 0.16}" fill="none" stroke="#FFFFFF" stroke-opacity="0.90" stroke-width="${line * 1.5}"/>
        <g fill="none" stroke="${support}" stroke-width="${line}"><circle cx="${x + w * 0.16}" cy="${y + h * 0.18}" r="${dot * 1.30}"/><circle cx="${x + w * 0.27}" cy="${y + h * 0.11}" r="${dot * 0.72}"/><circle cx="${x2 - w * 0.15}" cy="${y + h * 0.23}" r="${dot * 1.05}"/></g>
        <path d="M ${x + w * 0.09} ${y2 - h * 0.08} Q ${x + w * 0.06} ${y2 - h * 0.27} ${x + w * 0.15} ${y2 - h * 0.36} M ${x + w * 0.12} ${y2 - h * 0.18} l ${dot * 1.3} -${dot * 1.1} M ${x + w * 0.11} ${y2 - h * 0.24} l -${dot * 1.0} -${dot * 1.0}" fill="none" stroke="${accent}" stroke-width="${line * 1.8}" stroke-linecap="round"/>`;
    } else if (sceneFamily === "ice") {
      const snowflake = (flakeX: number, flakeY: number, radius: number) => `<g data-motif-kind="snowflake" stroke="#FFFFFF" stroke-width="${line}" stroke-linecap="round"><path d="M ${flakeX - radius} ${flakeY} H ${flakeX + radius} M ${flakeX} ${flakeY - radius} V ${flakeY + radius} M ${flakeX - radius * 0.72} ${flakeY - radius * 0.72} L ${flakeX + radius * 0.72} ${flakeY + radius * 0.72} M ${flakeX - radius * 0.72} ${flakeY + radius * 0.72} L ${flakeX + radius * 0.72} ${flakeY - radius * 0.72}"/></g>`;
      motif = `<path d="M ${x} ${y2 - h * 0.20} L ${x + w * 0.19} ${y + h * 0.42} L ${x + w * 0.37} ${y2 - h * 0.20} L ${x + w * 0.58} ${y + h * 0.33} L ${x2} ${y2 - h * 0.20} V ${y2} H ${x} Z" fill="#FFFFFF" fill-opacity="0.46" stroke="${base}" stroke-opacity="0.38" stroke-width="${line}"/>
        ${snowflake(x + w * 0.16, y + h * 0.18, dot * 1.45)}${snowflake(x2 - w * 0.17, y + h * 0.24, dot)}
        <polygon points="${cx},${y + h * 0.08} ${cx + dot},${y + h * 0.18} ${cx},${y + h * 0.29} ${cx - dot},${y + h * 0.18}" fill="${support}" fill-opacity="0.52" stroke="#FFFFFF" stroke-width="${line * 0.8}"/>`;
    } else if (sceneFamily === "space") {
      motif = `<ellipse cx="${cx}" cy="${y + h * 0.47}" rx="${w * 0.40}" ry="${h * 0.19}" fill="none" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="${line}" transform="rotate(-15 ${cx} ${y + h * 0.47})"/>
        <circle cx="${x + w * 0.18}" cy="${y + h * 0.20}" r="${dot * 1.55}" fill="${support}" stroke="#FFFFFF" stroke-width="${line}"/><circle cx="${x2 - w * 0.18}" cy="${y + h * 0.30}" r="${dot}" fill="${accent}"/>
        <path d="M ${x + w * 0.12} ${y2 - h * 0.16} L ${x + w * 0.19} ${y2 - h * 0.31} L ${x + w * 0.26} ${y2 - h * 0.16} L ${x + w * 0.19} ${y2 - h * 0.21} Z M ${x2 - w * 0.26} ${y + h * 0.14} L ${x2 - w * 0.20} ${y + h * 0.03} L ${x2 - w * 0.14} ${y + h * 0.14} L ${x2 - w * 0.20} ${y + h * 0.10} Z" fill="#FFFFFF" fill-opacity="0.86"/>`;
    } else if (sceneFamily === "vehicles") {
      const checks = Array.from({ length: 8 }, (_, check) => `<rect x="${x + (check % 4) * w * 0.25}" y="${y2 - h * (check < 4 ? 0.18 : 0.09)}" width="${w * 0.25}" height="${h * 0.09}" fill="${check % 2 === (check < 4 ? 0 : 1) ? "#FFFFFF" : base}" fill-opacity="0.78"/>`).join("");
      motif = `<path d="M ${x} ${y2 - h * 0.34} H ${x2} V ${y2} H ${x} Z" fill="${escurecer(base, 0.34)}" fill-opacity="0.55"/><path d="M ${x} ${y2 - h * 0.27} H ${x2}" stroke="#FFFFFF" stroke-width="${line * 1.6}" stroke-dasharray="${w * 0.12} ${w * 0.08}"/>${checks}`;
    } else if (sceneFamily === "garden") {
      const flower = (flowerX: number, flowerY: number) => `<g data-motif-kind="flower" transform="translate(${flowerX} ${flowerY})"><circle cx="-${dot}" cy="0" r="${dot}" fill="${support}"/><circle cx="${dot}" cy="0" r="${dot}" fill="${support}"/><circle cx="0" cy="-${dot}" r="${dot}" fill="${accent}"/><circle cx="0" cy="${dot}" r="${dot}" fill="${accent}"/><circle cx="0" cy="0" r="${dot * 0.68}" fill="${corIdade}" stroke="#FFFFFF" stroke-width="${line * 0.6}"/></g>`;
      motif = `<path d="M ${x + w * 0.06} ${y2 - h * 0.08} Q ${x + w * 0.17} ${y + h * 0.28} ${x + w * 0.38} ${y + h * 0.14} M ${x2 - w * 0.06} ${y2 - h * 0.08} Q ${x2 - w * 0.17} ${y + h * 0.31} ${x2 - w * 0.36} ${y + h * 0.16}" fill="none" stroke="${base}" stroke-width="${line * 1.6}"/>
        ${flower(x + w * 0.18, y + h * 0.20)}${flower(x2 - w * 0.18, y + h * 0.23)}
        <g fill="${base}" fill-opacity="0.66"><ellipse cx="${x + w * 0.11}" cy="${y + h * 0.38}" rx="${dot * 1.5}" ry="${dot * 0.58}" transform="rotate(-36 ${x + w * 0.11} ${y + h * 0.38})"/><ellipse cx="${x2 - w * 0.11}" cy="${y + h * 0.42}" rx="${dot * 1.5}" ry="${dot * 0.58}" transform="rotate(36 ${x2 - w * 0.11} ${y + h * 0.42})"/></g>`;
    } else if (sceneFamily === "circus") {
      const pennants = Array.from({ length: 5 }, (_, pennant) => {
        const left = x + w * (0.08 + pennant * 0.17);
        return `<path d="M ${left} ${y + h * 0.13} H ${left + w * 0.13} L ${left + w * 0.065} ${y + h * 0.25} Z" fill="${indexedColor(index + pennant)}" fill-opacity="0.82" stroke="#FFFFFF" stroke-width="${line * 0.55}"/>`;
      }).join("");
      motif = `<path d="M ${x + w * 0.05} ${y + h * 0.13} Q ${cx} ${y + h * 0.03} ${x2 - w * 0.05} ${y + h * 0.13}" fill="none" stroke="${base}" stroke-width="${line * 1.4}"/>${pennants}<path d="M ${x} ${y2 - h * 0.20} Q ${x + w * 0.25} ${y2 - h * 0.30} ${cx} ${y2 - h * 0.20} T ${x2} ${y2 - h * 0.20} V ${y2} H ${x} Z" fill="${support}" fill-opacity="0.38"/>`;
    } else if (sceneFamily === "heroic") {
      motif = `<path d="M ${cx} ${y + h * 0.05} L ${cx + w * 0.10} ${y + h * 0.34} L ${x2 - w * 0.05} ${y + h * 0.19} L ${cx + w * 0.23} ${y + h * 0.49} L ${x2 - w * 0.08} ${y2 - h * 0.18} L ${cx} ${y + h * 0.62} L ${x + w * 0.08} ${y2 - h * 0.18} L ${cx - w * 0.23} ${y + h * 0.49} L ${x + w * 0.05} ${y + h * 0.19} L ${cx - w * 0.10} ${y + h * 0.34} Z" fill="${support}" fill-opacity="0.34" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="${line}"/>
        <path d="M ${x + w * 0.16} ${y2 - h * 0.13} l ${w * 0.10} -${h * 0.22} h -${w * 0.06} l ${w * 0.17} -${h * 0.26} l -${w * 0.06} ${h * 0.21} h ${w * 0.08} z" fill="${accent}" stroke="#FFFFFF" stroke-width="${line}"/>
        <g fill="${base}" fill-opacity="0.42"><circle cx="${x2 - w * 0.16}" cy="${y + h * 0.17}" r="${dot}"/><circle cx="${x2 - w * 0.24}" cy="${y + h * 0.12}" r="${dot * 0.58}"/><circle cx="${x2 - w * 0.10}" cy="${y + h * 0.27}" r="${dot * 0.72}"/></g>`;
    } else {
      motif = `<path d="M ${x + w * 0.06} ${y + h * 0.20} Q ${cx} ${y + h * 0.04} ${x2 - w * 0.06} ${y + h * 0.20}" fill="none" stroke="${support}" stroke-width="${line * 1.45}"/>
        <path d="M ${x} ${y2 - h * 0.18} Q ${x + w * 0.25} ${y2 - h * 0.30} ${cx} ${y2 - h * 0.18} T ${x2} ${y2 - h * 0.18} V ${y2} H ${x} Z" fill="${accent}" fill-opacity="0.34"/>
        <circle cx="${x + w * 0.14}" cy="${y + h * 0.18}" r="${dot * 1.25}" fill="${base}" stroke="#FFFFFF" stroke-width="${line}"/><circle cx="${x2 - w * 0.14}" cy="${y + h * 0.18}" r="${dot * 1.25}" fill="${support}" stroke="#FFFFFF" stroke-width="${line}"/>`;
    }

    return `<g data-theme-detail="true" data-commercial-depth="thematic-midground" data-visual-layer="midground" data-theme-family="${sceneFamily}" data-face-index="${faceIndexFor(f)}" data-face-role="${faceRole(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${x}" data-zone-y="${y}" data-zone-w="${w}" data-zone-h="${h}"${faceOrientationAttributes(f)}${faceSafeClip(f)}>${frame}${motif}</g>`;
  };
  const premiumFaceDetails = big.map(faceDetailBlock).join("");
  const borderAsset = borderAssets[0];
  const borderRatio = borderAsset && borderAsset.h > 0 ? borderAsset.w / borderAsset.h : 1;
  const borderHeight = borderAsset
    ? Math.min(avgFaceH * 0.32, bodyRowW / Math.max(1, borderRatio))
    : 0;
  const faixaTema = borderAsset
    ? `<image data-theme-border="true" href="${borderAsset.uri}" xlink:href="${borderAsset.uri}" x="${bodyRowX}" y="${bodyBot - borderHeight * 0.92}" width="${bodyRowW}" height="${borderHeight}" preserveAspectRatio="xMidYMid meet"/>`
    : !d.papelBodyUri
      ? `<rect x="${bodyRowX}" y="${bodyBot - avgFaceH * 0.14}" width="${bodyRowW}" height="${avgFaceH * 0.14}" fill="${corIdade}" opacity="0.82"/><path d="M ${bodyRowX} ${bodyBot - avgFaceH * 0.14} H ${bodyRowX + bodyRowW}" stroke="#FFFFFF" stroke-width="${Math.max(3, avgFaceH * 0.014)}" opacity="0.82"/>`
      : "";
  const depthBand = !borderAsset && d.papelBodyUri && compositionProfile === "cenario"
    ? `<g data-commercial-depth="ground-plane">
        <rect x="${bodyRowX}" y="${bodyBot - avgFaceH * 0.19}" width="${bodyRowW}" height="${avgFaceH * 0.19}" fill="${corIdade}" opacity="0.18"/>
        <path d="M ${bodyRowX} ${bodyBot - avgFaceH * 0.19} H ${bodyRowX + bodyRowW}" stroke="#FFFFFF" stroke-width="${Math.max(3, avgFaceH * 0.012)}" opacity="0.72"/>
      </g>`
    : "";
  const closureBands = `<g data-scene-continuity="closure-bands">
      <rect x="${bodyRowX}" y="${bodyTop}" width="${bodyRowW}" height="${Math.max(5, avgFaceH * 0.025)}" fill="${corIdade}" fill-opacity="0.88"/>
      ${isVibrant ? `<rect x="${bodyRowX}" y="${bodyTop + Math.max(5, avgFaceH * 0.025)}" width="${bodyRowW}" height="${Math.max(3, avgFaceH * 0.014)}" fill="${corAcento}" fill-opacity="0.92"/>` : ""}
      <rect x="${bodyRowX}" y="${bodyBot - Math.max(5, avgFaceH * 0.025)}" width="${bodyRowW}" height="${Math.max(5, avgFaceH * 0.025)}" fill="${corNome}" fill-opacity="0.78"/>
    </g>`;

  const plateGeometryFor = (f: Face) => {
    if (isSingleWideFace) {
      const width = f.w * 0.38;
      const maxHeight = f.h * 0.30;
      const height = d.placaUri
        ? Math.min(maxHeight, width * ((d.placaMeta?.h || 202) / (d.placaMeta?.w || 320)))
        : Math.min(maxHeight, width * fallbackPlateAspectRatio);
      return {
        x: f.x + f.w * 0.60,
        y: f.y + f.h * 0.57,
        width,
        height,
      };
    }
    const nameWidth = isMilk ? qualityStandard.milkNamePlateWidth : qualityStandard.namePlateWidth;
    const width = f.w * (nameWidth.target / 100);
    const maxHeight = f.h * (isMilk ? 0.28 : 0.32);
    const height = d.placaUri
      ? Math.min(maxHeight, width * ((d.placaMeta?.h || 202) / (d.placaMeta?.w || 320)))
      : Math.min(maxHeight, width * fallbackPlateAspectRatio);
    return {
      x: f.cx - width / 2,
      y: f.y + f.h - height - f.h * 0.065,
      width,
      height,
    };
  };

  const nameArtBaseFor = (f: Face) => plateGeometryFor(f).y - f.h * 0.04;

  // ---- personagem grande ancorado na base da face ----
  const personagemBlock = (
    img: ClipartDados,
    f: Face,
    alturaPct: number,
    espelhar = false,
    baseOverride?: number,
    widthPct: number = qualityStandard.stickerMaxWidthToFace,
    centerOverride?: number,
    horizontalBounds?: { left: number; right: number },
  ) => {
    const ratio = img.w / img.h;
    const safeLeft = f.x + f.w * safe.horizontal;
    const safeRight = f.x + f.w * (1 - safe.horizontal);
    const boundedLeft = Math.max(safeLeft, horizontalBounds?.left ?? safeLeft);
    const boundedRight = Math.min(safeRight, horizontalBounds?.right ?? safeRight);
    const maxSafeWidth = Math.max(1, boundedRight - boundedLeft);
    const safeTop = f.y + f.h * safe.top;
    const ordinarySafeBase = f.y + f.h * (1 - safe.bottom);
    const reservedBase = Math.min(baseOverride ?? ordinarySafeBase, ordinarySafeBase);
    const maxSafeHeight = Math.max(1, reservedBase - safeTop);
    let ah = Math.min(f.h * alturaPct, maxSafeHeight);
    let aw = ah * ratio;
    const widthLimit = Math.min(maxSafeWidth, f.w * widthPct);
    if (aw > widthLimit) {
      aw = widthLimit;
      ah = aw / ratio;
    }
    const desiredCx = centerOverride ?? f.cx;
    const cx = Math.max(
      boundedLeft + aw / 2,
      Math.min(boundedRight - aw / 2, desiredCx),
    );
    const safeBase = ordinarySafeBase;
    const requestedBase = baseOverride ?? safeBase - Math.max(0, borderHeight * 0.08);
    const base = Math.min(requestedBase, safeBase);
    const y = Math.max(safeTop, base - ah);
    const backdropFill = compositionProfile === "modular"
      ? clarear(corAcento, isVibrant ? 0.42 : 0.68)
      : clarear(indexedColor(faceIndexFor(f)), isElegant ? 0.78 : isVibrant ? 0.50 : 0.66);
    const backdrop = `<ellipse data-commercial-depth="midground" data-visual-layer="midground" cx="${cx}" cy="${y + ah * 0.47}" rx="${Math.min(f.w * 0.40, Math.max(aw * 0.58, f.w * 0.27))}" ry="${Math.min(f.h * 0.38, Math.max(ah * 0.50, f.h * 0.24))}" fill="${backdropFill}" fill-opacity="${isElegant ? 0.74 : isVibrant ? 0.88 : 0.80}" stroke="#FFFFFF" stroke-opacity="0.94" stroke-width="${Math.max(4, f.w * 0.012)}" filter="url(#ornamentShadow)"/>`;
    const groundShadow = `<ellipse data-commercial-depth="contact-shadow" cx="${cx}" cy="${Math.min(safeBase, base + f.h * 0.006)}" rx="${Math.min(f.w * 0.32, aw * 0.38)}" ry="${Math.max(f.h * 0.018, ah * 0.025)}" fill="${escurecer(corAcento, 0.42)}" fill-opacity="0.24" filter="url(#softShadow)"/>`;
    const visibleCoverage = Number.isFinite(img.visibleCoverage)
      ? Math.max(0, Math.min(1, img.visibleCoverage!))
      : 0.72;
    const imagem = `<image href="${img.uri}" xlink:href="${img.uri}" data-theme-hero="true" data-print-safe="true" data-face-index="${faceIndexFor(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-visible-coverage="${visibleCoverage.toFixed(4)}" x="${cx - aw / 2}" y="${y}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet" filter="url(#adesivo)"/>`;
    const role = faceRole(f);
    const faceIndex = faceIndexFor(f);
    const priority = role === "front" ? "primary" : role === "side" ? "supporting" : "secondary";
    const layeredHero = `<g data-commercial-layering="hero" data-face-role="${role}" data-face-index="${faceIndex}" data-visual-priority="${priority}" data-crease-safe="true"${faceOrientationAttributes(f)}${faceSafeClip(f)}>${backdrop}${groundShadow}${imagem}</g>`;
    return espelhar ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${layeredHero}</g>` : layeredHero;
  };

  const supportingCharacterBlock = (img: ClipartDados, f: Face, index: number) => {
    const ratio = img.h > 0 ? img.w / img.h : 1;
    const isProtectedNameFace = milkNameFaces.includes(f) || f === nameFace;
    const maxWidth = f.w * (isProtectedNameFace ? 0.46 : 0.54);
    const maxHeight = f.h * (isProtectedNameFace ? 0.38 : 0.50);
    let width = maxWidth;
    let height = width / Math.max(0.1, ratio);
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }
    const onRight = index % 2 === 0;
    const x = onRight
      ? f.x + f.w * (1 - safe.horizontal) - width
      : f.x + f.w * safe.horizontal;
    const safeTop = f.y + f.h * safe.top;
    const ordinarySafeBase = f.y + f.h * (1 - safe.bottom);
    const visualBase = isProtectedNameFace
      ? Math.min(nameArtBaseFor(f) - f.h * 0.018, ordinarySafeBase)
      : ordinarySafeBase - f.h * 0.012;
    const y = Math.max(safeTop, visualBase - height);
    const cx = x + width / 2;
    const visibleCoverage = Number.isFinite(img.visibleCoverage)
      ? Math.max(0, Math.min(1, img.visibleCoverage!))
      : 0.72;
    return `<g data-theme-supporting="true" data-commercial-layering="supporting-character" data-commercial-depth="foreground-support" data-face-index="${faceIndexFor(f)}" data-face-role="${faceRole(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${x}" data-zone-y="${y}" data-zone-w="${width}" data-zone-h="${height}"${faceOrientationAttributes(f)}${faceSafeClip(f)}>
      <ellipse data-commercial-depth="contact-shadow" cx="${cx}" cy="${Math.min(ordinarySafeBase, visualBase + f.h * 0.004)}" rx="${Math.min(f.w * 0.24, width * 0.36)}" ry="${Math.max(f.h * 0.012, height * 0.024)}" fill="${escurecer(indexedColor(index + 2), 0.38)}" fill-opacity="0.22" filter="url(#softShadow)"/>
      <image href="${img.uri}" xlink:href="${img.uri}" data-supporting-character="true" data-print-safe="true" data-face-index="${faceIndexFor(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-visible-coverage="${visibleCoverage.toFixed(4)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" filter="url(#adesivo)"/>
    </g>`;
  };

  const monogramBlock = (f: Face, compact = false) => {
    const size = Math.min(f.w * (compact ? 0.50 : 0.68), f.h * (compact ? 0.42 : 0.60));
    const cx = f.cx;
    const cy = f.y + f.h * (compact ? 0.30 : 0.48);
    const initial = esc(Array.from(nome.trim())[0]?.toUpperCase() || "");
    return `<g data-theme-monogram="true" data-face-index="${faceIndexFor(f)}" data-face-role="${faceRole(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${cx - size * 0.43}" data-zone-y="${cy - size * 0.50}" data-zone-w="${size * 0.86}" data-zone-h="${size}"${faceOrientationAttributes(f)}>
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
    return `<g data-theme-panel="true" data-face-index="${faceIndexFor(f)}" data-face-role="${faceRole(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${x - f.w * 0.025}" data-zone-y="${y - f.h * 0.025}" data-zone-w="${panelW + f.w * 0.05}" data-zone-h="${panelH + f.h * 0.05}"${faceOrientationAttributes(f)}>
      <rect x="${x - f.w * 0.025}" y="${y - f.h * 0.025}" width="${panelW + f.w * 0.05}" height="${panelH + f.h * 0.05}" rx="${f.w * 0.06}" fill="#FFFDF8" fill-opacity="0.90" stroke="${corIdade}" stroke-width="${Math.max(3, f.w * 0.012)}"/>
      <image href="${asset.uri}" xlink:href="${asset.uri}" x="${x}" y="${y}" width="${panelW}" height="${panelH}" preserveAspectRatio="xMidYMid slice" opacity="0.82"/>
    </g>`;
  };

  // ---- plaquinha de nome com contraste forte e zona exclusiva ----
  const ornamentBlock = (f: Face, asset?: ClipartDados) => {
    if (!asset) return "";
    const ratio = asset.h > 0 ? asset.w / asset.h : 1;
    let aw = f.w * 0.82;
    let ah = aw / Math.max(0.1, ratio);
    if (ah > f.h * 0.42) {
      ah = f.h * 0.42;
      aw = ah * ratio;
    }
    const x = f.cx - aw / 2;
    const y = f.y + f.h * 0.07;
    return `<g data-theme-ornament="true" data-face-index="${faceIndexFor(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${x}" data-zone-y="${y}" data-zone-w="${aw}" data-zone-h="${ah}"${faceOrientationAttributes(f)}><image href="${asset.uri}" xlink:href="${asset.uri}" x="${x}" y="${y}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMid meet"/></g>`;
  };

  const ornamentAccentBlock = (f: Face, asset: ClipartDados, index: number, compact: boolean) => {
    const ratio = asset.h > 0 ? asset.w / asset.h : 1;
    let aw = f.w * (compact ? 0.30 : 0.46);
    let ah = aw / Math.max(0.1, ratio);
    const heightLimit = f.h * (compact ? 0.22 : 0.34);
    if (ah > heightLimit) {
      ah = heightLimit;
      aw = ah * ratio;
    }
    const onRight = index % 2 === 0;
    const safeX = f.w * safe.horizontal;
    const x = onRight
      ? f.x + f.w - aw - safeX
      : f.x + safeX;
    const y = compact
      ? f.y + f.h * 0.07
      : f.y + f.h - ah * 0.90 - f.h * 0.025;
    return `<g data-theme-foreground="true" data-commercial-depth="foreground-ornament" data-crease-safe="true" data-face-index="${faceIndexFor(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${x}" data-zone-y="${y}" data-zone-w="${aw}" data-zone-h="${ah}"${faceOrientationAttributes(f)}${faceSafeClip(f)}><image href="${asset.uri}" xlink:href="${asset.uri}" x="${x}" y="${y}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMid meet" filter="url(#ornamentShadow)"/></g>`;
  };

  const plateBlock = (f: Face) => {
    // texto sempre legível: cores de tema claras são escurecidas na plaquinha
    const corTextoBase = luminancia(corNome) > 0.6 ? escurecer(corNome, 0.45) : corNome;
    const corTexto = garantirContrasteNoClaro(corTextoBase);
    const plateGeometry = plateGeometryFor(f);
    const plW = plateGeometry.width;
    const temPlaca = !!d.placaUri;
    const plH = plateGeometry.height;
    const cx = plateGeometry.x + plW / 2;
    const plY = plateGeometry.y;
    const inset = Math.max(5, plH * 0.075);
    const fundoPlaca = temPlaca
      ? `<rect data-commercial-depth="name-shadow" x="${cx - plW / 2}" y="${plY + plH * 0.035}" width="${plW}" height="${plH * 0.93}" rx="${plH * 0.24}" fill="#111111" fill-opacity="0.16" filter="url(#softShadow)"/><image href="${d.placaUri}" xlink:href="${d.placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" preserveAspectRatio="xMidYMid meet"/>`
      : `<rect data-commercial-depth="name-shadow" x="${cx - plW / 2}" y="${plY + plH * 0.045}" width="${plW}" height="${plH * 0.92}" rx="${plH * 0.24}" fill="#111111" fill-opacity="0.16" filter="url(#softShadow)"/>
        <rect x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" rx="${plH * 0.24}" fill="${corIdade}" stroke="#FFFDF8" stroke-width="${Math.max(5, plH * 0.055)}"/>
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
    const bowW = plW * (qualityStandard.premiumBow.widthToPlate.target / 100);
    const bowH = bowW * 0.48;
    const bowCy = plY + plH * 0.07;
    const bowStroke = escurecer(corAcento, 0.28);
    const bow = `<g data-premium-bow="true" data-protected-zone="decorative-bow" transform="translate(${cx} ${bowCy})" filter="url(#bowShadow)">
      <path d="M -${bowW * 0.06} 0 C -${bowW * 0.18} -${bowH * 0.44}, -${bowW * 0.50} -${bowH * 0.50}, -${bowW * 0.47} -${bowH * 0.04} C -${bowW * 0.44} ${bowH * 0.32}, -${bowW * 0.18} ${bowH * 0.25}, -${bowW * 0.06} 0 Z" fill="url(#bowSilk)" stroke="${bowStroke}" stroke-width="${Math.max(2, bowW * 0.018)}"/>
      <path d="M ${bowW * 0.06} 0 C ${bowW * 0.18} -${bowH * 0.44}, ${bowW * 0.50} -${bowH * 0.50}, ${bowW * 0.47} -${bowH * 0.04} C ${bowW * 0.44} ${bowH * 0.32}, ${bowW * 0.18} ${bowH * 0.25}, ${bowW * 0.06} 0 Z" fill="url(#bowSilk)" stroke="${bowStroke}" stroke-width="${Math.max(2, bowW * 0.018)}"/>
      <path d="M -${bowW * 0.07} ${bowH * 0.10} L -${bowW * 0.27} ${bowH * 0.58} L -${bowW * 0.10} ${bowH * 0.48} L 0 ${bowH * 0.18} Z M ${bowW * 0.07} ${bowH * 0.10} L ${bowW * 0.27} ${bowH * 0.58} L ${bowW * 0.10} ${bowH * 0.48} L 0 ${bowH * 0.18} Z" fill="${escurecer(corAcento, 0.08)}" stroke="${bowStroke}" stroke-width="${Math.max(2, bowW * 0.014)}"/>
      <ellipse cx="0" cy="0" rx="${bowW * 0.105}" ry="${bowH * 0.24}" fill="${corIdade}" stroke="#FFFDF8" stroke-width="${Math.max(2, bowW * 0.018)}"/>
      <path d="M -${bowW * 0.36} -${bowH * 0.15} Q -${bowW * 0.25} -${bowH * 0.31} -${bowW * 0.13} -${bowH * 0.12} M ${bowW * 0.13} -${bowH * 0.12} Q ${bowW * 0.25} -${bowH * 0.31} ${bowW * 0.36} -${bowH * 0.15}" fill="none" stroke="#FFFFFF" stroke-opacity="0.72" stroke-width="${Math.max(2, bowW * 0.014)}" stroke-linecap="round"/>
    </g>`;
    return `<g data-name-plate="true" data-protected-zone="name" data-personalization-layout="${isSingleWideFace ? "side-by-side" : "stacked"}" data-face-index="${faceIndexFor(f)}" data-face-role="${faceRole(f)}" data-face-x="${f.x}" data-face-y="${f.y}" data-face-w="${f.w}" data-face-h="${f.h}" data-zone-x="${plateGeometry.x}" data-zone-y="${plateGeometry.y}" data-zone-w="${plateGeometry.width}" data-zone-h="${plateGeometry.height}"${faceOrientationAttributes(f)}>
      ${fundoPlaca}
      ${bow}
      <text x="${cx}" y="${nomeY}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${fsNome}"${nomeFit} fill="${corTexto}" stroke="#FFFFFF" stroke-width="${fsNome * 0.08}" paint-order="stroke">${esc(nome)}</text>
      ${idadeTxt}
    </g>`;
  };

  // ---- uma funcao visual por face: personagem, nome, painel ou monograma ----
  const heroTarget = compositionProfile === "modular"
    ? qualityStandard.modularElementHeight.target / 100
    : qualityStandard.heroHeight.target / 100;
  const heroHeightFor = (img: ClipartDados, role = "standard") => {
    const ratio = img.h > 0 ? img.w / img.h : 1;
    const naturalTarget = ratio >= 1.1 ? Math.max(heroTarget, 0.86) : Math.max(heroTarget, 0.90);
    if (role === "side") return Math.min(naturalTarget, 0.74);
    if (role === "back") return Math.min(naturalTarget, 0.82);
    return naturalTarget;
  };
  const heroWidthFor = (role: string) => role === "side" ? 0.70 : role === "back" ? 0.82 : 0.94;
  const heroBaseFor = (face: Face, role: string) => role === "side" ? face.y + face.h * 0.78 : undefined;
  const heroFitForFace = (img: ClipartDados, face: Face, maxWidthOverride?: number) => {
    const ratio = img.h > 0 ? img.w / img.h : 1;
    const role = faceRole(face);
    const maxWidth = Math.min(face.w * heroWidthFor(role), maxWidthOverride ?? Number.POSITIVE_INFINITY);
    const maxHeight = face.h * heroHeightFor(img, role);
    const height = Math.min(maxHeight, maxWidth / Math.max(0.1, ratio));
    const width = Math.min(maxWidth, height * ratio);
    const visibleCoverage = Number.isFinite(img.visibleCoverage)
      ? Math.max(0, Math.min(1, img.visibleCoverage!))
      : 0.72;
    return (width * height * visibleCoverage) / Math.max(1, face.w * face.h);
  };
  let visualContent = "";
  let protectedNameContent = "";
  if (big.length === 1) {
    const f = big[0];
    const sideBySideBounds = isSingleWideFace
      ? {
          left: f.x + f.w * safe.horizontal,
          right: plateGeometryFor(f).x - f.w * 0.02,
        }
      : undefined;
    const sideBySideWidth = sideBySideBounds
      ? Math.max(1, sideBySideBounds.right - sideBySideBounds.left)
      : undefined;
    const bestSingleFaceHero = orderedHeroes
      .slice()
      .sort((a, b) => heroFitForFace(b, f, sideBySideWidth) - heroFitForFace(a, f, sideBySideWidth))[0];
    visualContent = bestSingleFaceHero
      ? personagemBlock(
          bestSingleFaceHero,
          f,
          heroHeightFor(bestSingleFaceHero),
          false,
          isSingleWideFace ? undefined : nameArtBaseFor(f),
          isSingleWideFace ? 0.96 : 0.90,
          isSingleWideFace ? f.x + f.w * 0.29 : undefined,
          sideBySideBounds,
        )
      : monogramBlock(f, true);
    protectedNameContent = plateBlock(f);
  } else {
    const heroAssignments = new Map<Face, ClipartDados>();
    if (!hasMilkPanels && orderedHeroes.length) {
      const primaryFace = big
        .filter((face) => face !== nameFace)
        .slice()
        .sort((a, b) => heroFitForFace(orderedHeroes[0], b) - heroFitForFace(orderedHeroes[0], a))[0] ?? nameFace;
      heroAssignments.set(primaryFace, orderedHeroes[0]);
      const remainingFaces = [nameFace, ...big.filter((face) => face !== nameFace && face !== primaryFace)];
      const remainingHeroes = orderedHeroes.slice(1);
      remainingFaces.forEach((face) => {
        if (!remainingHeroes.length) return;
        let bestIndex = 0;
        for (let index = 1; index < remainingHeroes.length; index++) {
          if (heroFitForFace(remainingHeroes[index], face) > heroFitForFace(remainingHeroes[bestIndex], face)) {
            bestIndex = index;
          }
        }
        const [hero] = remainingHeroes.splice(bestIndex, 1);
        heroAssignments.set(face, hero);
      });
    }
    const primaryAssignments = hasMilkPanels ? milkHeroes : heroAssignments;
    const assignedAssets = new Set(primaryAssignments.values());
    const supportingAssignments = new Map<Face, ClipartDados>();
    const supportFaces = [
      ...big.filter((face) => !milkNameFaces.includes(face) && face !== nameFace),
      ...big.filter((face) => milkNameFaces.includes(face) || face === nameFace),
    ];
    orderedHeroes
      .filter((asset) => !assignedAssets.has(asset))
      .slice(0, supportFaces.length)
      .forEach((asset, index) => supportingAssignments.set(supportFaces[index], asset));
    let panelUsed = false;
    let nameIndex = 0;
    const nameParts: string[] = [];
    visualContent = big
      .map((f) => {
        const role = faceRole(f);
        const assignedHero = hasMilkPanels ? milkHeroes.get(f) : heroAssignments.get(f);
        const support = supportingAssignments.get(f);
        const supportArt = support ? supportingCharacterBlock(support, f, faceIndexFor(f)) : "";
        if (milkNameFaces.includes(f) || f === nameFace) {
          const supportingCharacter = assignedHero;
          const ornament = !supportingCharacter && ornamentAssets.length
            ? ornamentBlock(f, ornamentAssets[nameIndex % ornamentAssets.length])
            : "";
          const upperArt = supportingCharacter
            ? personagemBlock(
                supportingCharacter,
                f,
                Math.max(
                  qualityStandard.nameFaceElementHeight.target / 100,
                  heroHeightFor(supportingCharacter, role),
                ),
                false,
                nameArtBaseFor(f),
                heroWidthFor(role),
              )
            : ornament || monogramBlock(f, true);
          nameIndex++;
          nameParts.push(plateBlock(f));
          return `${upperArt}${supportArt}`;
        }
        const img = assignedHero;
        if (img) return `${personagemBlock(img, f, heroHeightFor(img, role), false, heroBaseFor(f, role), heroWidthFor(role))}${supportArt}`;
        if (!panelUsed && panelAssets[0]) {
          panelUsed = true;
          return `${panelBlock(f, panelAssets[0])}${supportArt}`;
        }
        return `${monogramBlock(f)}${supportArt}`;
      })
      .join("");
    protectedNameContent = nameParts.join("");
  }
  const foregroundAccents = ornamentAssets.length
    ? big.map((f, index) => ornamentAccentBlock(
        f,
        ornamentAssets[index % ornamentAssets.length],
        index,
        milkNameFaces.includes(f) || f === nameFace,
      )).join("")
    : "";

  const fontFace = d.fonteUri
    ? `<style>@font-face{font-family:'${family}';src:url('${d.fonteUri}');}</style>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <title>Kit personalizado de ${esc(nome)}</title>
  <metadata id="alice-quality-standard">${ALICE_QUALITY_STANDARD.version}</metadata>
  <metadata id="deterministic-quality-gate">kit-svg-r2</metadata>
  <metadata id="market-research-version">${MARKET_VISUAL_RESEARCH.version}</metadata>
  <metadata id="market-reference-sample-size">${MARKET_VISUAL_RESEARCH.sampleSize}</metadata>
  <metadata id="direct-paper-craft-sample-size">${MARKET_VISUAL_RESEARCH.directPaperCraftSampleSize}</metadata>
  <metadata id="google-image-validation-size">${MARKET_VISUAL_RESEARCH.googleImageValidation.sampleSize}</metadata>
  <metadata id="shopee-indexed-validation-size">${MARKET_VISUAL_RESEARCH.googleImageValidation.shopeeIndexedSampleSize}</metadata>
  <metadata id="shopee-direct-access">${MARKET_VISUAL_RESEARCH.googleImageValidation.shopeeDirectAccess}</metadata>
  <metadata id="alice-composition-profile">${compositionProfile}</metadata>
  <metadata id="color-appearance">${paletteAppearance}</metadata>
  <metadata id="printable-face-count">${big.length}</metadata>
  <metadata id="available-hero-asset-count">${heroAssets.length}</metadata>
  <metadata id="safe-face-geometry">${structuralFaces.every((face) => [face.safeX, face.safeY, face.safeW, face.safeH].every(Number.isFinite)) ? "detected" : "legacy"}</metadata>
  <metadata id="oriented-face-count">${big.filter((face) => Math.abs((face.safeRotation ?? 0) % 360) > 0.01).length}</metadata>
  <metadata id="face-orientation-metadata-count">${structuralFaces.filter((face) => Number.isFinite(face.safeRotation)).length}</metadata>
  <metadata id="technical-mold-instance-count">1</metadata>
  ${frontFace ? `<metadata id="front-face-index">${big.indexOf(frontFace)}</metadata>` : ""}
  ${milkNameFaces.length ? `<metadata id="side-face-indices">${milkNameFaces.map((face) => big.indexOf(face)).join(",")}</metadata>` : ""}
  <defs>
    ${fontFace}
    ${defsPapel.join("\n    ")}
    ${faceSafeClipPaths}
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${clarear(corFundo, 0.28)}"/><stop offset="1" stop-color="${corFundo}"/>
    </linearGradient>
    <filter id="adesivo" x="-18%" y="-18%" width="136%" height="145%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${Math.max(4, Math.round(avgFaceH * qualityStandard.stickerOutlineToFaceHeight))}" result="dila"/>
      <feFlood flood-color="#FFFFFF" result="cor"/>
      <feComposite in="cor" in2="dila" operator="in" result="contorno"/>
      <feDropShadow in="SourceAlpha" dx="0" dy="${Math.max(3, avgFaceH * 0.010)}" stdDeviation="${Math.max(2, avgFaceH * 0.007)}" flood-color="#2E1725" flood-opacity="0.30" result="adesivoShadow"/>
      <feMerge><feMergeNode in="adesivoShadow"/><feMergeNode in="contorno"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softShadow" x="-25%" y="-80%" width="150%" height="260%">
      <feGaussianBlur stdDeviation="${Math.max(3, avgFaceH * 0.012)}"/>
    </filter>
    <filter id="bowShadow" x="-25%" y="-35%" width="150%" height="185%">
      <feDropShadow dx="0" dy="${Math.max(2, avgFaceH * 0.006)}" stdDeviation="${Math.max(1.5, avgFaceH * 0.004)}" flood-color="#32152A" flood-opacity="0.28"/>
    </filter>
    <filter id="ornamentShadow" x="-20%" y="-25%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${Math.max(2, avgFaceH * 0.005)}" stdDeviation="${Math.max(1.5, avgFaceH * 0.004)}" flood-color="#2E1725" flood-opacity="0.24"/>
    </filter>
    <linearGradient id="bowSilk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${clarear(corAcento, 0.30)}"/>
      <stop offset="0.48" stop-color="${corAcento}"/>
      <stop offset="1" stop-color="${escurecer(corAcento, 0.22)}"/>
    </linearGradient>
    <clipPath id="paperShape" clipPathUnits="userSpaceOnUse">${moldGeometry}</clipPath>
    <mask id="interior" maskUnits="userSpaceOnUse" maskContentUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" mask-type="alpha" style="mask-type:alpha"><image href="${d.maskUri}" xlink:href="${d.maskUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/></mask>
  </defs>
  <rect width="${W}" height="${H}" fill="#FFFFFF"/>
  <g mask="url(#interior)" clip-path="url(#paperShape)">
    ${fundoTopo}
    ${fundoBase}
    ${fundoCorpo}
    ${panoramicScene}
    ${vibrantColorLayer}
    ${elegantFinishLayer}
    ${sceneLayer}
    ${premiumFaceDetails}
    ${closureBands}
    ${faixaTema}
    ${depthBand}
    ${visualContent}
    ${foregroundAccents}
    ${protectedNameContent}
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

export async function composeKit({ molde, assets, themeSlug, nome, idade, palette, typography }: ComposeInput): Promise<string> {
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
    themeSlug,
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
    paletteAppearance: palette?.appearance,
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
