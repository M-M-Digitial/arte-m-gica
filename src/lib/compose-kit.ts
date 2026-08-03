// compose-kit — motor do padrão Alice: biblioteca de temas + molde vetorial +
// nome → arte SVG editável. O layout é PURO (montarSvgKit) para rodar igual no
// navegador e no harness de prévia (tools/ingestao/preview-kit.mjs).

export interface MoldeCompose {
  svg_url: string;
  mask_url: string;
  faces_url: string;
}

export interface TemaAsset {
  kind: string;
  name: string;
  url: string;
  role: string;
  meta?: any;
}

export interface ComposeInput {
  molde: MoldeCompose;
  assets: TemaAsset[];
  nome: string;
  idade?: string;
}

interface Face { x: number; y: number; w: number; h: number; cx: number; cy: number; area: number }

export interface ClipartDados { uri: string; w: number; h: number }

// análise do papel do corpo: estampas densas ("busy") viram destaque em faces
// alternadas/abas (padrão Alice), nunca papel de parede do corpo inteiro
export interface PapelInfo { busy: boolean; corMedia: string }

export interface KitDados {
  moldSvg: string;
  facesJson: string;
  maskUri: string;
  papelTopUri: string | null;
  papelBodyUri: string | null;
  papelBodyInfo?: PapelInfo | null;
  principal: ClipartDados | null;
  amigo: ClipartDados | null;
  amigo2: ClipartDados | null;
  placaUri: string | null;
  placaMeta: { w?: number; h?: number } | null;
  fonteFamily: string;
  fonteUri: string | null;
  corNome: string;
  corIdade: string;
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

// ---------------------------------------------------------------------------
// LAYOUT PURO — "Padrão Alice": papel na escala certa, personagem grande
// ancorado no chão, faixa de cenário, plaquinha de nome com contraste.
// ---------------------------------------------------------------------------
export function montarSvgKit(d: KitDados): string {
  const { nome, idade, corNome, corIdade } = d;
  const family = d.fonteFamily || "sans-serif";
  const familyAttr = escAttr(family);

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
  const nameFace = big
    .slice()
    .sort((a, b) => Math.abs(a.cx - W / 2) - Math.abs(b.cx - W / 2))[0];
  const avgFaceW = big.reduce((s, f) => s + f.w, 0) / big.length;
  const avgFaceH = big.reduce((s, f) => s + f.h, 0) / big.length;

  // face de respiro (padrão A-B-A-C dos kits reais): sem personagem; quando o
  // papel do corpo é estampa densa, é ela que recebe a estampa em destaque
  const respiro = big.length >= 4
    ? big.filter((f) => f !== nameFace).sort((a, b) => Math.abs(b.cx - W / 2) - Math.abs(a.cx - W / 2))[0]
    : null;

  // linha do chão: base das faces do corpo, com folga p/ personagem "pisar"
  // preset equilibrado da pesquisa Alice: faixa de chão de 18%; temas densos
  // sobem para 22% para ancorar a cena sem roubar espaço da plaquinha.
  const chaoAltura = avgFaceH * (d.papelBodyInfo?.busy ? 0.22 : 0.18);
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
  const estampaDensa = !!(d.papelBodyUri && d.papelBodyInfo?.busy);
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
  const personagens = [d.principal, d.amigo, d.amigo2].filter(Boolean) as ClipartDados[];
  const personagemBlock = (img: ClipartDados, f: Face, alturaPct: number, espelhar = false) => {
    const ratio = img.w / img.h;
    let ah = f.h * alturaPct;
    let aw = ah * ratio;
    if (aw > f.w * 0.92) { aw = f.w * 0.92; ah = aw / ratio; }
    const cx = f.cx;
    const base = bodyBot - chaoAltura * 0.12; // pé a ~3% da borda inferior (estudo Alice)
    const imagem = `<image href="${img.uri}" xlink:href="${img.uri}" x="${cx - aw / 2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet" filter="url(#adesivo)"/>`;
    // repetição do mesmo personagem em outra face: espelha p/ dar variedade
    return espelhar ? `<g transform="translate(${2 * cx} 0) scale(-1 1)">${imagem}</g>` : imagem;
  };

  // ---- plaquinha de nome com contraste forte ----
  // estudo Alice: largura mediana 58% da face, encostada na linha do chão
  // (o personagem pode sobrepor a placa — assinatura dos kits reais)
  const plateBlock = (f: Face) => {
    // texto sempre legível: cores de tema claras são escurecidas na plaquinha
    const corTexto = luminancia(corNome) > 0.6 ? escurecer(corNome, 0.45) : corNome;
    const plW = Math.min(f.w * 0.62, avgFaceW * 0.72);
    const temPlaca = !!d.placaUri;
    const plH = temPlaca
      ? plW * ((d.placaMeta?.h || 202) / (d.placaMeta?.w || 320))
      : plW * 0.34;
    const cx = f.cx;
    const plY = chaoY - plH * 0.45;
    const escalope: string[] = [];
    if (!temPlaca) {
      const nBolas = 12;
      for (let i = 0; i < nBolas; i++) {
        const ang = (i / nBolas) * Math.PI * 2;
        escalope.push(`<ellipse cx="${cx + Math.cos(ang) * plW * 0.48}" cy="${plY + plH / 2 + Math.sin(ang) * plH * 0.52}" rx="${plW * 0.075}" ry="${plW * 0.075}" fill="#FFFFFF" stroke="${corNome}" stroke-width="5"/>`);
      }
    }
    const fundoPlaca = temPlaca
      ? `<image href="${d.placaUri}" xlink:href="${d.placaUri}" x="${cx - plW / 2}" y="${plY}" width="${plW}" height="${plH}" preserveAspectRatio="xMidYMid meet"/>`
      : `${escalope.join("")}
         <ellipse cx="${cx}" cy="${plY + plH / 2}" rx="${plW * 0.5}" ry="${plH * 0.55}" fill="#FFFFFF" stroke="${corNome}" stroke-width="7"/>
         <ellipse cx="${cx}" cy="${plY + plH / 2}" rx="${plW * 0.44}" ry="${plH * 0.46}" fill="none" stroke="${corIdade}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>`;
    // nome ajustado à largura (nunca estoura a plaquinha)
    const fsNome = Math.min(plW * 0.19, (plW * 0.8) / Math.max(3, nome.length) * 1.9);
    const nomeFit = nome.length > 10
      ? ` textLength="${plW * 0.78}" lengthAdjust="spacingAndGlyphs"`
      : "";
    const idadeTxt = idade?.trim()
      ? (() => {
          const bW = Math.max(plW * 0.34, idade.length * plW * 0.07 + plW * 0.2);
          const bH = plH * 0.30;
          const bY = plY + plH * 0.78;
          return `
        <rect x="${cx - bW / 2}" y="${bY}" width="${bW}" height="${bH}" rx="${bH / 2}" fill="${corIdade}" stroke="#FFFFFF" stroke-width="5"/>
        <text x="${cx}" y="${bY + bH * 0.68}" text-anchor="middle" font-family="${familyAttr}" font-weight="bold" font-size="${bH * 0.55}" fill="#FFFFFF">${esc(idade)} ${/^\d+$/.test(idade) ? "anos" : ""}</text>`;
        })()
      : "";
    return `${fundoPlaca}
    <text x="${cx}" y="${plY + plH * 0.5}" text-anchor="middle" dominant-baseline="middle" font-family="${familyAttr}" font-size="${fsNome}"${nomeFit} fill="${corTexto}" stroke="#FFFFFF" stroke-width="${fsNome * 0.09}" paint-order="stroke" font-weight="bold">${esc(nome)}</text>
    ${idadeTxt}`;
  };

  // ---- distribuição: nome na face central; personagens grandes nas demais;
  // com 4+ faces grandes, uma fica de RESPIRO só com cenário (padrão A-B-A-C) ----
  let content = "";
  if (big.length === 1) {
    const f = big[0];
    content =
      (personagens[0] ? personagemBlock(personagens[0], { ...f, cx: f.x + f.w * 0.26 } as Face, 0.55) : "") +
      plateBlock({ ...f, cx: f.x + f.w * 0.68 } as Face) +
      (personagens[1] ? personagemBlock(personagens[1], { ...f, cx: f.x + f.w * 0.88, w: f.w * 0.4 } as Face, 0.4) : "");
  } else {
    let idx = 0;
    content = big
      .map((f) => {
        if (f === nameFace) {
          // com 1 personagem só, a cópia da face do nome sai espelhada
          const abaixo = personagens[0]
            ? personagemBlock(personagens[0], f, 0.5, personagens.length === 1)
            : "";
          return abaixo + plateBlock(f);
        }
        if (f === respiro) return "";
        // pesquisa Alice: herói equilibrado ocupa cerca de 55% da face
        const img = personagens.length ? personagens[idx % personagens.length] : null;
        const espelhar = personagens.length ? Math.floor(idx / personagens.length) % 2 === 1 : false;
        idx++;
        return img ? personagemBlock(img, f, estampaDensa ? 0.50 : 0.55, espelhar) : "";
      })
      .join("");
  }

  const fontFace = d.fonteUri
    ? `<style>@font-face{font-family:'${family}';src:url('${d.fonteUri}');}</style>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <title>Kit personalizado de ${esc(nome)}</title>
  <defs>
    ${fontFace}
    ${defsPapel.join("\n    ")}
    <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#CDEFFB"/><stop offset="1" stop-color="#9FD9F2"/>
    </linearGradient>
    <filter id="adesivo" x="-8%" y="-8%" width="116%" height="116%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="${Math.max(4, Math.round(avgFaceH * 0.012))}" result="dila"/>
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
    ${fundoCorpo}
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
// Arte ORIGINAL da Alice: o PDF final dela rasterizado vira o fundo e o app
// só escreve o nome (halo branco + cor do tema com contraste garantido).
// O texto fica vetorial no SVG — a artesã move/edita no Canva se quiser.
// ---------------------------------------------------------------------------
export interface ArteAliceDados {
  imagemUri: string;
  largura: number;
  altura: number;
  nome: string;
  idade?: string;
  fonteFamily: string;
  fonteUri: string | null;
  corNome: string;
}

export function montarSvgAlice(d: ArteAliceDados): string {
  const { largura: W, altura: H, nome, idade } = d;
  const family = d.fonteFamily || "sans-serif";
  const familyAttr = escAttr(family);
  const corTexto = luminancia(d.corNome) > 0.6 ? escurecer(d.corNome, 0.45) : d.corNome;
  const fsNome = Math.min(W * 0.045, (W * 0.26) / Math.max(4, nome.length) * 1.9);
  const cx = W * 0.5;
  const cy = H * 0.24;
  const fontFace = d.fonteUri
    ? `<style>@font-face{font-family:'${familyAttr}';src:url('${d.fonteUri}');}</style>`
    : "";
  const texto = (txt: string, y: number, tam: number) =>
    `<text x="${cx}" y="${y}" text-anchor="middle" font-family="${familyAttr}" font-weight="bold" font-size="${tam}" fill="${corTexto}" stroke="#FFFFFF" stroke-width="${tam * 0.22}" stroke-linejoin="round" paint-order="stroke">${esc(txt)}</text>`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img">
  <title>Arte personalizada de ${esc(nome)}</title>
  <defs>${fontFace}</defs>
  <image id="arte-original" href="${d.imagemUri}" xlink:href="${d.imagemUri}" x="0" y="0" width="${W}" height="${H}" preserveAspectRatio="none"/>
  ${texto(nome, cy, fsNome)}
  ${idade?.trim() ? texto(/^\d+$/.test(idade) ? `${idade} anos` : idade, cy + fsNome * 0.95, fsNome * 0.6) : ""}
</svg>`;
}

export async function composeAlice(opts: {
  imageUrl: string;
  largura: number | null;
  altura: number | null;
  assets: TemaAsset[];
  nome: string;
  idade?: string;
}): Promise<string> {
  const fonte = opts.assets.find((a) => a.kind === "fonte");
  const [imagemUri, fonteUri] = await Promise.all([
    fetchDataUri(opts.imageUrl),
    fonte ? fetchDataUri(fonte.url) : Promise.resolve(null),
  ]);
  // medidas reais caso o banco não tenha
  let W = opts.largura ?? 0, H = opts.altura ?? 0;
  if (!W || !H) {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = imagemUri; });
    W = img.naturalWidth; H = img.naturalHeight;
  }
  return montarSvgAlice({
    imagemUri,
    largura: W,
    altura: H,
    nome: opts.nome,
    idade: opts.idade,
    fonteFamily: fonte?.meta?.family || "sans-serif",
    fonteUri,
    corNome: fonte?.meta?.cor || "#7A2FB0",
  });
}

// ---------------------------------------------------------------------------
// IO do navegador
// ---------------------------------------------------------------------------
const fetchText = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar ${url}`);
  return r.text();
};

const fetchDataUri = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Falha ao baixar ${url}`);
  const blob = await r.blob();
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
};

async function trimTransparent(dataUri: string): Promise<{ uri: string; w: number; h: number }> {
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

export async function composeKit({ molde, assets, nome, idade }: ComposeInput): Promise<string> {
  const byRole = (role: string) => assets.find((a) => a.role === role);
  const fonte = assets.find((a) => a.kind === "fonte");
  const placa = assets.find((a) => a.kind === "placa");
  const papelTop = byRole("top");
  const papelBody = byRole("body");
  const principal = byRole("principal");
  const amigo = byRole("amigo");
  const amigo2 = byRole("amigo2");

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

  const [pTrim, aTrim, a2Trim, bodyInfo] = await Promise.all([
    principalUri ? trimTransparent(principalUri) : Promise.resolve(null),
    amigoUri ? trimTransparent(amigoUri) : Promise.resolve(null),
    amigo2Uri ? trimTransparent(amigo2Uri) : Promise.resolve(null),
    bodyUri ? analisarPapel(bodyUri).catch(() => null) : Promise.resolve(null),
  ]);

  return montarSvgKit({
    moldSvg,
    facesJson,
    maskUri,
    papelTopUri: topUri,
    papelBodyUri: bodyUri,
    papelBodyInfo: bodyInfo,
    principal: pTrim ? { uri: pTrim.uri, w: pTrim.w, h: pTrim.h } : null,
    amigo: aTrim ? { uri: aTrim.uri, w: aTrim.w, h: aTrim.h } : null,
    amigo2: a2Trim ? { uri: a2Trim.uri, w: a2Trim.w, h: a2Trim.h } : null,
    placaUri,
    placaMeta: placa?.meta ?? null,
    fonteFamily: fonte?.meta?.family || "sans-serif",
    fonteUri,
    corNome: fonte?.meta?.cor || "#7A2FB0",
    corIdade: fonte?.meta?.cor2 || "#1BA67C",
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
