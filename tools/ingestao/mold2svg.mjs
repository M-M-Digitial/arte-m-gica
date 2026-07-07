import fs from "node:fs";
import { JSDOM } from "jsdom";
import { createCanvas } from "@napi-rs/canvas";
import potrace from "potrace";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
globalThis.document = dom.window.document;

const pdfjsMod = await import("pdfjs-dist/es5/build/pdf.js");
const pdfjs = pdfjsMod.default ?? pdfjsMod;

class NodeCanvasFactory {
  create(w, h) { const canvas = createCanvas(w, h); return { canvas, context: canvas.getContext("2d") }; }
  reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

const inPath = process.argv[2];
const outPath = process.argv[3];
const SCALE = Number(process.argv[4] || 3);

const data = new Uint8Array(fs.readFileSync(inPath));
const canvasFactory = new NodeCanvasFactory();
const doc = await pdfjs.getDocument({ data, disableWorker: true, canvasFactory }).promise;
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: SCALE });

const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
const context = canvas.getContext("2d");
// fundo branco (o PDF pode ser transparente)
context.fillStyle = "#ffffff";
context.fillRect(0, 0, canvas.width, canvas.height);
await page.render({ canvasContext: context, viewport, canvasFactory }).promise;
const png = canvas.toBuffer("image/png");

// potrace: traça as linhas escuras como vetor
const svg = await new Promise((resolve, reject) => {
  potrace.trace(png, { threshold: 160, turdSize: 3, optCurve: true, color: "#000000", background: "transparent" },
    (err, svgStr) => err ? reject(err) : resolve(svgStr));
});
fs.writeFileSync(outPath, svg);
const paths = (svg.match(/<path/g) || []).length;
console.log(`OK -> ${outPath} | ${svg.length} bytes | ${paths} path(s) | render ${canvas.width}x${canvas.height}`);
