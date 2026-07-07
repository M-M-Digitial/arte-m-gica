import fs from "node:fs";
import { JSDOM } from "jsdom";
import { createCanvas } from "@napi-rs/canvas";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.document = dom.window.document;
const pdfjsMod = await import("pdfjs-dist/es5/build/pdf.js");
const pdfjs = pdfjsMod.default ?? pdfjsMod;

class NodeCanvasFactory {
  create(w, h) { const c = createCanvas(w, h); return { canvas: c, context: c.getContext("2d") }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const inPath = process.argv[2];
const outJson = process.argv[3];
const SCALE = Number(process.argv[4] || 3);

const data = new Uint8Array(fs.readFileSync(inPath));
const canvasFactory = new NodeCanvasFactory();
const doc = await pdfjs.getDocument({ data, disableWorker: true, canvasFactory }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: SCALE });
const W = Math.ceil(viewport.width), H = Math.ceil(viewport.height);
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, W, H);
await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;

const img = ctx.getImageData(0, 0, W, H).data;
const N = W * H;
const DIL = Number(process.argv[5] || 6); // dilatação p/ fechar vãos dos tracejados
const maskOut = process.argv[6] || null;  // opcional: PNG de máscara do interior
let isLine = new Uint8Array(N);
for (let i = 0; i < N; i++) {
  const r = img[i*4], g = img[i*4+1], b = img[i*4+2];
  if (0.299*r + 0.587*g + 0.114*b < 160) isLine[i] = 1;
}
const isLine0 = isLine.slice(); // linhas originais (sem dilatação) p/ máscara fina
// dilata as linhas DIL vezes (4-viz) para transformar tracejado em barreira contínua
for (let it = 0; it < DIL; it++) {
  const next = isLine.slice();
  for (let i = 0; i < N; i++) {
    if (isLine[i]) continue;
    const x = i % W, y = (i/W)|0;
    if ((x>0&&isLine[i-1])||(x<W-1&&isLine[i+1])||(y>0&&isLine[i-W])||(y<H-1&&isLine[i+W])) next[i]=1;
  }
  isLine = next;
}

// flood-fill "fora" a partir das bordas
const outside = new Uint8Array(N);
const stack = new Int32Array(N); let sp = 0;
const push = (idx) => { if (!outside[idx] && !isLine[idx]) { outside[idx] = 1; stack[sp++] = idx; } };
for (let x = 0; x < W; x++) { push(x); push((H-1)*W + x); }
for (let y = 0; y < H; y++) { push(y*W); push(y*W + W-1); }
while (sp > 0) { const idx = stack[--sp]; const x = idx % W, y = (idx/W)|0;
  if (x>0) push(idx-1); if (x<W-1) push(idx+1); if (y>0) push(idx-W); if (y<H-1) push(idx+W); }

// connected components das faces internas (nao-linha, nao-fora)
const label = new Int32Array(N).fill(0);
let comp = 0; const faces = [];
for (let s = 0; s < N; s++) {
  if (isLine[s] || outside[s] || label[s]) continue;
  comp++; let area = 0, minX = W, minY = H, maxX = 0, maxY = 0;
  sp = 0; stack[sp++] = s; label[s] = comp;
  while (sp > 0) {
    const idx = stack[--sp]; const x = idx % W, y = (idx/W)|0;
    area++; if (x<minX)minX=x; if (x>maxX)maxX=x; if (y<minY)minY=y; if (y>maxY)maxY=y;
    const nb = [x>0?idx-1:-1, x<W-1?idx+1:-1, y>0?idx-W:-1, y<H-1?idx+W:-1];
    for (const n of nb) if (n>=0 && !isLine[n] && !outside[n] && !label[n]) { label[n]=comp; stack[sp++]=n; }
  }
  faces.push({ x: minX, y: minY, w: maxX-minX+1, h: maxY-minY+1, area, cx: (minX+maxX)/2, cy: (minY+maxY)/2 });
}

const minArea = N * 0.004; // ignora ruído
const kept = faces.filter(f => f.area >= minArea).sort((a,b)=>b.area-a.area);
fs.writeFileSync(outJson, JSON.stringify({ W, H, faces: kept }, null, 0));

// máscara do interior (branco = pintável): tudo que não é "fora" nem linha original
if (maskOut) {
  // corrige o halo: expande o "fora" de volta pela banda de dilatação,
  // parando nas linhas ORIGINAIS (o contorno de corte é sólido e bloqueia)
  for (let it = 0; it < DIL; it++) {
    const next = outside.slice();
    for (let i = 0; i < N; i++) {
      if (outside[i] || isLine0[i]) continue;
      const x = i % W, y = (i/W)|0;
      if ((x>0&&outside[i-1])||(x<W-1&&outside[i+1])||(y>0&&outside[i-W])||(y<H-1&&outside[i+W])) next[i]=1;
    }
    outside.set(next);
  }
  const mc = createCanvas(W, H);
  const mx = mc.getContext("2d");
  const mi = mx.createImageData(W, H);
  for (let i = 0; i < N; i++) {
    const inside = !outside[i] && !isLine0[i];
    mi.data[i*4] = 255; mi.data[i*4+1] = 255; mi.data[i*4+2] = 255;
    mi.data[i*4+3] = inside ? 255 : 0;
  }
  mx.putImageData(mi, 0, 0);
  fs.writeFileSync(maskOut, mc.toBuffer("image/png"));
  console.log(`mascara interior -> ${maskOut}`);
}
console.log(`${inPath.split(/[\\/]/).pop()} | ${W}x${H} | ${comp} regioes, ${kept.length} faces validas`);
for (const f of kept.slice(0, 8)) console.log(`  face area=${(f.area/N*100).toFixed(1)}%  bbox ${f.x},${f.y} ${f.w}x${f.h}`);
