import fs from "node:fs";
import { createCanvas, loadImage } from "@napi-rs/canvas";

// Pré-processa assets da Alice: converte tudo p/ PNG e, quando pedido,
// remove fundo branco (chroma-key) p/ cliparts/placas usados sobre a cena.
const TMP = "C:/Users/marco/AppData/Local/Temp/claude/C--Users-marco-Code/556a1e5e-6a5f-4d66-bf5f-e8638883147c/scratchpad";
const IN = (n) => `${TMP}/estudo_sereia/papeis/p${n}.img`;
const OUTDIR = `${TMP}/estudo_sereia/proc`;
fs.mkdirSync(OUTDIR, { recursive: true });

const jobs = [
  { n: 3, out: "escamas.png", keyWhite: false },
  { n: 6, out: "escamas_wide.png", keyWhite: false },
  { n: 8, out: "ariel.png", keyWhite: false },      // já tem alpha
  { n: 24, out: "sebastiao.png", keyWhite: true },
  { n: 26, out: "linguado.png", keyWhite: true },
  { n: 28, out: "placa.png", keyWhite: true },
];

for (const j of jobs) {
  const img = await loadImage(IN(j.n));
  const cv = createCanvas(img.width, img.height);
  const cx = cv.getContext("2d");
  cx.drawImage(img, 0, 0);
  if (j.keyWhite) {
    const id = cx.getImageData(0, 0, cv.width, cv.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (r > 242 && g > 242 && b > 242) d[i+3] = 0;           // branco puro → transparente
      else if (r > 228 && g > 228 && b > 228) d[i+3] = Math.round(255 * (255 - Math.min(r,g,b)) / 27); // borda suave
    }
    cx.putImageData(id, 0, 0);
  }
  fs.writeFileSync(`${OUTDIR}/${j.out}`, cv.toBuffer("image/png"));
  console.log(`${j.out}: ${img.width}x${img.height} ${j.keyWhite ? "(fundo removido)" : ""}`);
}
