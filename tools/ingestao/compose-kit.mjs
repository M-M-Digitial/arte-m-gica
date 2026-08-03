import fs from "node:fs";

// compose-kit — motor genérico do padrão Alice (kit Sereia) p/ QUALQUER molde.
// Usa máscara de interior por pixel (funciona com faces triangulares/irregulares):
//   zona topo (acima do corpo) = papel de escamas | corpo = cena aquática
//   conteúdo (cliparts/nome) distribuído nas faces grandes | linhas do molde por cima
const TMP = "C:/Users/marco/AppData/Local/Temp/claude/C--Users-marco-Code/556a1e5e-6a5f-4d66-bf5f-e8638883147c/scratchpad";

const moldName = process.argv[2];           // ex: "Caixa Bala"
const outPath = process.argv[3];
const nome = process.argv[4] || "Sofia";
const idade = process.argv[5] || "5";

const moldSvgPath = `${TMP}/moldes_svg/${moldName}.svg`;
const facesPath = `${TMP}/estudo_sereia/faces_${moldName}.json`;
const maskPath = `${TMP}/estudo_sereia/mask_${moldName}.png`;

const dataUri = (f) => `data:image/png;base64,${fs.readFileSync(f).toString("base64")}`;
const PROC = (f) => `${TMP}/estudo_sereia/proc/${f}`;

const escamas = dataUri(PROC("escamas.png"));
const ariel = dataUri(PROC("ariel.png"));
const sebastiao = dataUri(PROC("sebastiao.png"));
const linguado = dataUri(PROC("linguado.png"));
const placa = dataUri(PROC("placa.png"));
const interiorMask = dataUri(maskPath);

const moldSvg = fs.readFileSync(moldSvgPath, "utf8");
const [, , W, H] = moldSvg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
const moldInner = moldSvg.match(/<path[\s\S]*?\/>/i)[0];
const { faces } = JSON.parse(fs.readFileSync(facesPath, "utf8"));

// ---- zonas por geometria ----
const maxH = Math.max(...faces.map(f => f.h));
const body = faces.filter(f => f.h >= maxH * 0.6);              // faces do corpo
const bodyTop = Math.min(...body.map(f => f.y));
const bodyBot = Math.max(...body.map(f => f.y + f.h));
const sandY = bodyTop + (bodyBot - bodyTop) * 0.72;

// faces grandes p/ receber conteúdo (área >= 45% da maior), ordenadas por x
const maxA = Math.max(...faces.map(f => f.area));
const big = faces.filter(f => f.area >= maxA * 0.45).sort((a, b) => a.x - b.x);
// a mais central recebe o NOME; as outras alternam cliparts
const nameFace = big.slice().sort((a, b) => Math.abs(a.cx - W/2) - Math.abs(b.cx - W/2))[0];

// decorativos
const alga = (x, y, s, cor) => `<path d="M0,0 C-8,-28 8,-40 0,-70 C-6,-92 6,-104 0,-128" transform="translate(${x} ${y}) scale(${s})" fill="none" stroke="${cor}" stroke-width="7" stroke-linecap="round" opacity="0.85"/>`;
const coral = (x, y, s, cor) => `<g transform="translate(${x} ${y}) scale(${s})" opacity="0.9"><path d="M0,0 L0,-42 M0,-18 L-16,-38 M0,-24 L15,-46 M-16,-38 L-20,-58 M15,-46 L20,-64" fill="none" stroke="${cor}" stroke-width="8" stroke-linecap="round"/></g>`;
const bolhas = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF" opacity="0.55"><circle r="7"/><circle cx="14" cy="-22" r="4.5"/><circle cx="-6" cy="-40" r="6"/><circle cx="10" cy="-60" r="3.5"/></g>`;
const estrela = (x, y, s, cor) => `<path d="M0,-10 L2.9,-3.1 10,-3.1 4.5,1.8 6.5,9 0,4.9 -6.5,9 -4.5,1.8 -10,-3.1 -2.9,-3.1 Z" transform="translate(${x} ${y}) scale(${s})" fill="${cor}" opacity="0.9"/>`;

const decor = big.map((p) =>
  alga(p.x + p.w*0.10, sandY + 6, 0.9, "#2E9E7B") +
  coral(p.x + p.w*0.24, sandY + 12, 0.9, "#E58BB6") +
  coral(p.x + p.w*0.82, sandY + 14, 0.8, "#C07AD8") +
  estrela(p.x + p.w*0.55, sandY + 26, 2.0, "#F2A24B") +
  bolhas(p.x + p.w*0.16, p.y + p.h*0.25, 1.2) +
  bolhas(p.x + p.w*0.85, p.y + p.h*0.40, 1.0)
).join("\n    ");

// blocos de conteúdo (com TETO de tamanho — placa nunca domina a face)
const plateBlock = (cx, cy, availW) => {
  const plW = Math.min(availW * 0.9, 520);
  const plH = plW * (202/320);
  const plY = cy - plH * 0.55;
  return `
    <image href="${placa}" x="${cx - plW/2}" y="${plY}" width="${plW}" height="${plH}"/>
    <text x="${cx}" y="${plY + plH*0.50}" text-anchor="middle" font-family="Amarillo" font-size="${plW*0.155}" fill="#7A2FB0">${nome}</text>
    <text x="${cx}" y="${plY + plH*0.86}" text-anchor="middle" font-family="Amarillo" font-size="${plW*0.075}" fill="#FFFFFF" stroke="#1BA67C" stroke-width="1.5" paint-order="stroke">${idade} anos</text>`;
};
const arielBlock = (cx, availW, faceBottom) => {
  const aw = Math.min(availW * 0.85, 460), ah = aw * (698/830);
  const base = Math.min(sandY + 10, faceBottom - 6);
  return `<image href="${ariel}" x="${cx - aw/2}" y="${base - ah}" width="${aw}" height="${ah}" preserveAspectRatio="xMidYMax meet"/>`;
};
const amigosBlock = (cx, availW, faceTop, faceBottom) => {
  const lw = Math.min(availW * 0.5, 260), lh = lw * (634/706);
  const sw = Math.min(availW * 0.55, 280), sh = sw * (530/421);
  const base = Math.min(sandY + 10, faceBottom - 6);
  return `
    <image href="${linguado}" x="${cx - lw/2}" y="${faceTop + 20}" width="${lw}" height="${lh}" preserveAspectRatio="xMidYMid meet"/>
    <image href="${sebastiao}" x="${cx - sw/2}" y="${base - sh*0.72}" width="${sw}" height="${sh*0.72}" preserveAspectRatio="xMidYMax meet"/>`;
};

// conteúdo: 1 face grande → tudo distribuído nela; várias → 1 bloco por face
let content = "";
if (big.length === 1) {
  const p = big[0];
  content =
    arielBlock(p.x + p.w * 0.18, p.w * 0.30, p.y + p.h) +
    plateBlock(p.cx, p.cy, p.w * 0.42) +
    amigosBlock(p.x + p.w * 0.82, p.w * 0.30, p.y, p.y + p.h);
} else {
  let flip = 0;
  content = big.map((p) => {
    const availW = Math.min(p.w, p.h);
    if (p === nameFace) return plateBlock(p.cx, p.cy, availW * 1.15);
    flip++;
    if (flip % 2 === 1) return arielBlock(p.cx, availW, p.y + p.h);
    return amigosBlock(p.cx, availW, p.y, p.y + p.h);
  }).join("\n    ");
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#BFE8F7"/><stop offset="0.55" stop-color="#9AD6EF"/><stop offset="1" stop-color="#7CC5E8"/>
    </linearGradient>
    <linearGradient id="areia" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FBF0C8"/><stop offset="1" stop-color="#F4DFA3"/>
    </linearGradient>
    <clipPath id="paperShape" clipPathUnits="userSpaceOnUse">${moldInner}</clipPath>
    <mask id="interior"><image href="${interiorMask}" x="0" y="0" width="${W}" height="${H}"/></mask>
  </defs>

  <rect width="${W}" height="${H}" fill="#FFFFFF"/>

  <g mask="url(#interior)" clip-path="url(#paperShape)">
    <!-- zona topo: papel de escamas (tudo acima do corpo) -->
    <image href="${escamas}" x="0" y="0" width="${W}" height="${bodyTop}" preserveAspectRatio="xMidYMid slice"/>
    <!-- corpo: cena aquática -->
    <rect x="0" y="${bodyTop}" width="${W}" height="${bodyBot - bodyTop}" fill="url(#agua)"/>
    <path d="M 0 ${sandY + 24} Q ${W*0.25} ${sandY - 10} ${W*0.5} ${sandY + 16} T ${W} ${sandY + 12} L ${W} ${bodyBot} L 0 ${bodyBot} Z" fill="url(#areia)"/>
    ${decor}
    ${content}
    <!-- abaixo do corpo fica branco (padrão Alice) -->
    <rect x="0" y="${bodyBot}" width="${W}" height="${H - bodyBot}" fill="#FFFFFF"/>
  </g>

  <g fill="#111111">${moldInner.replace(/fill="[^"]*"/, "")}</g>
</svg>`;

fs.writeFileSync(outPath, svg);
console.log(`OK ${moldName}: ${(svg.length/1024/1024).toFixed(1)} MB | corpo y=${bodyTop}..${bodyBot} | ${big.length} faces grandes`);
