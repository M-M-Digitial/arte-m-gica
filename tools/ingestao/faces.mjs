import fs from "node:fs";
import { JSDOM } from "jsdom";
import { createCanvas, loadImage } from "@napi-rs/canvas";

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
const isPdf = /\.pdf$/i.test(inPath);
const SCALE = Number(process.argv[4] || (isPdf ? 3 : 1));

let W;
let H;
let canvas;
let ctx;
if (isPdf) {
  const data = new Uint8Array(fs.readFileSync(inPath));
  const canvasFactory = new NodeCanvasFactory();
  const doc = await pdfjs.getDocument({ data, disableWorker: true, canvasFactory }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: SCALE });
  W = Math.ceil(viewport.width);
  H = Math.ceil(viewport.height);
  canvas = createCanvas(W, H);
  ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  await page.render({ canvasContext: ctx, viewport, canvasFactory }).promise;
} else {
  const image = await loadImage(inPath);
  W = Math.ceil(image.width * SCALE);
  H = Math.ceil(image.height * SCALE);
  canvas = createCanvas(W, H);
  ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(image, 0, 0, W, H);
}

const img = ctx.getImageData(0, 0, W, H).data;
const N = W * H;
const DIL = Number(process.argv[5] || 6); // dilatação p/ fechar vãos dos tracejados
const maskOut = process.argv[6] || null;  // opcional: PNG de máscara do interior
const detectOrientedSafeZones = process.argv[7] === "oriented";
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
  faces.push({ component: comp, x: minX, y: minY, w: maxX-minX+1, h: maxY-minY+1, area, cx: (minX+maxX)/2, cy: (minY+maxY)/2 });
}

const minArea = N * 0.004; // ignora ruído
const candidates = faces.filter(f => f.area >= minArea).sort((a,b)=>b.area-a.area);
// Componentes totalmente contidos em outro são recortes vazados (por exemplo,
// o furo central das alças), não superfícies que devam receber estampa.
const holeComponents = new Set(
  candidates
    .filter((inner) => candidates.some((outer) =>
      inner.component !== outer.component
      && inner.area < outer.area * 0.9
      && inner.x > outer.x + 2
      && inner.y > outer.y + 2
      && inner.x + inner.w < outer.x + outer.w - 2
      && inner.y + inner.h < outer.y + outer.h - 2
    ))
    .map((face) => face.component),
);
const kept = candidates.filter((face) => !holeComponents.has(face.component));

function largestRectangleInMask(width, height, isInside) {
  const heights = new Int32Array(width);
  const stack = new Int32Array(width + 1);
  let best = { x: 0, y: 0, w: 1, h: 1, area: 1 };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) heights[x] = isInside(x, y) ? heights[x] + 1 : 0;

    let stackSize = 0;
    for (let x = 0; x <= width; x++) {
      const currentHeight = x < width ? heights[x] : 0;
      while (stackSize > 0 && heights[stack[stackSize - 1]] > currentHeight) {
        const index = stack[--stackSize];
        const rectangleHeight = heights[index];
        const left = stackSize > 0 ? stack[stackSize - 1] + 1 : 0;
        const rectangleWidth = x - left;
        const area = rectangleWidth * rectangleHeight;
        if (area > best.area) {
          best = {
            x: left,
            y: y - rectangleHeight + 1,
            w: rectangleWidth,
            h: rectangleHeight,
            area,
          };
        }
      }
      if (x < width) stack[stackSize++] = x;
    }
  }

  return best;
}

function largestInteriorRectangle(face) {
  const safe = largestRectangleInMask(
    face.w,
    face.h,
    (localX, localY) => label[(face.y + localY) * W + face.x + localX] === face.component,
  );
  return { ...safe, x: face.x + safe.x, y: face.y + safe.y, rotation: 0 };
}

function largestInteriorOrientedRectangle(face) {
  const axisAligned = largestInteriorRectangle(face);
  const sample = 4;
  const sourceWidth = Math.ceil(face.w / sample);
  const sourceHeight = Math.ceil(face.h / sample);
  const sourceCanvas = createCanvas(sourceWidth, sourceHeight);
  const sourceContext = sourceCanvas.getContext("2d");
  const sourceImage = sourceContext.createImageData(sourceWidth, sourceHeight);

  for (let y = 0; y < sourceHeight; y++) {
    for (let x = 0; x < sourceWidth; x++) {
      const globalX = Math.min(face.x + face.w - 1, face.x + Math.floor((x + 0.5) * sample));
      const globalY = Math.min(face.y + face.h - 1, face.y + Math.floor((y + 0.5) * sample));
      if (label[globalY * W + globalX] !== face.component) continue;
      const offset = (y * sourceWidth + x) * 4;
      sourceImage.data[offset] = 255;
      sourceImage.data[offset + 1] = 255;
      sourceImage.data[offset + 2] = 255;
      sourceImage.data[offset + 3] = 255;
    }
  }
  sourceContext.putImageData(sourceImage, 0, 0);

  let best = null;
  for (let angle = -85; angle <= 90; angle += 5) {
    const radians = angle * Math.PI / 180;
    const cosine = Math.cos(radians);
    const sine = Math.sin(radians);
    const rotatedWidth = Math.ceil(Math.abs(sourceWidth * cosine) + Math.abs(sourceHeight * sine));
    const rotatedHeight = Math.ceil(Math.abs(sourceWidth * sine) + Math.abs(sourceHeight * cosine));
    const rotatedCanvas = createCanvas(rotatedWidth, rotatedHeight);
    const rotatedContext = rotatedCanvas.getContext("2d");
    rotatedContext.imageSmoothingEnabled = false;
    rotatedContext.translate(rotatedWidth / 2, rotatedHeight / 2);
    rotatedContext.rotate(radians);
    rotatedContext.drawImage(sourceCanvas, -sourceWidth / 2, -sourceHeight / 2);
    rotatedContext.setTransform(1, 0, 0, 1, 0, 0);
    const pixels = rotatedContext.getImageData(0, 0, rotatedWidth, rotatedHeight).data;
    const rectangle = largestRectangleInMask(
      rotatedWidth,
      rotatedHeight,
      (x, y) => pixels[(y * rotatedWidth + x) * 4 + 3] >= 250,
    );
    if (best && rectangle.area <= best.rectangle.area) continue;

    const rotatedCenterX = rectangle.x + rectangle.w / 2 - rotatedWidth / 2;
    const rotatedCenterY = rectangle.y + rectangle.h / 2 - rotatedHeight / 2;
    const originalCenterX = rotatedCenterX * cosine + rotatedCenterY * sine;
    const originalCenterY = -rotatedCenterX * sine + rotatedCenterY * cosine;
    best = {
      rectangle,
      centerX: face.x + (sourceWidth / 2 + originalCenterX) * sample,
      centerY: face.y + (sourceHeight / 2 + originalCenterY) * sample,
      rotation: -angle,
    };
  }

  if (!best) return axisAligned;
  const margin = sample * 2;
  const width = Math.max(1, best.rectangle.w * sample - margin * 2);
  const height = Math.max(1, best.rectangle.h * sample - margin * 2);
  const oriented = {
    x: best.centerX - width / 2,
    y: best.centerY - height / 2,
    w: width,
    h: height,
    area: width * height,
    rotation: best.rotation,
  };
  return oriented.area > axisAligned.area * 1.08 ? oriented : axisAligned;
}

const publicFaces = kept.map(({ component, ...face }) => {
  const safe = detectOrientedSafeZones
    ? largestInteriorOrientedRectangle({ component, ...face })
    : largestInteriorRectangle({ component, ...face });
  return {
    ...face,
    safeX: safe.x,
    safeY: safe.y,
    safeW: safe.w,
    safeH: safe.h,
    safeRotation: safe.rotation,
  };
});
fs.writeFileSync(outJson, JSON.stringify({ W, H, faces: publicFaces }, null, 0));

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
    const inside = !outside[i] && !isLine0[i] && !holeComponents.has(label[i]);
    mi.data[i*4] = 255; mi.data[i*4+1] = 255; mi.data[i*4+2] = 255;
    mi.data[i*4+3] = inside ? 255 : 0;
  }
  mx.putImageData(mi, 0, 0);
  fs.writeFileSync(maskOut, mc.toBuffer("image/png"));
  console.log(`mascara interior -> ${maskOut}`);
}
console.log(`${inPath.split(/[\\/]/).pop()} | ${W}x${H} | ${comp} regioes, ${kept.length} faces validas (${holeComponents.size} recortes removidos)`);
for (const f of publicFaces.slice(0, 8)) console.log(`  face area=${(f.area/N*100).toFixed(1)}%  bbox ${f.x},${f.y} ${f.w}x${f.h}`);
