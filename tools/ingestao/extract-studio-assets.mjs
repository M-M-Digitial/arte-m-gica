import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { extractStudioAssets } from "./studio-assets.mjs";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("uso: node extract-studio-assets.mjs <arquivo-ou-pasta> <pasta-saida>");
  process.exit(1);
}

const input = resolve(inputArg);
const output = resolve(outputArg);
if (!existsSync(input)) throw new Error(`Entrada nao encontrada: ${input}`);
mkdirSync(output, { recursive: true });

const files = statSync(input).isDirectory()
  ? readdirSync(input).map((name) => join(input, name)).filter((path) => extname(path).toLowerCase() === ".studio3")
  : [input];

const seen = new Set();
const manifest = [];

function analyzeTransparency(image) {
  const canvas = createCanvas(image.width, image.height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, image.width, image.height).data;
  const pixelCount = image.width * image.height;
  const stride = Math.max(1, Math.floor(Math.sqrt(pixelCount / 250_000)));
  let samples = 0;
  let transparent = 0;
  let visible = 0;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += stride) {
    for (let x = 0; x < image.width; x += stride) {
      const alpha = pixels[(y * image.width + x) * 4 + 3];
      samples += 1;
      if (alpha < 32) transparent += 1;
      if (alpha <= 32) continue;
      visible += 1;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  const visibleCoverage = visible
    ? ((maxX - minX + stride) * (maxY - minY + stride)) / pixelCount
    : 0;
  return {
    transparentFraction: samples ? transparent / samples : 0,
    visibleFraction: samples ? visible / samples : 0,
    visibleCoverage: Math.min(1, visibleCoverage),
  };
}

export function isLikelyCharacterAsset(asset) {
  if (asset.extension !== "png") return false;
  if (!asset.width || !asset.height || Math.min(asset.width, asset.height) < 420) return false;
  const aspectRatio = asset.width / asset.height;
  if (aspectRatio < 0.22 || aspectRatio > 1.95) return false;
  if (asset.bytes < 50_000) return false;
  if ((asset.transparentFraction ?? 0) < 0.025) return false;
  if ((asset.visibleFraction ?? 0) < 0.025) return false;
  return true;
}

for (const path of files) {
  const source = basename(path);
  for (const asset of extractStudioAssets(readFileSync(path))) {
    if (seen.has(asset.sha256)) continue;
    seen.add(asset.sha256);

    const name = `asset-${String(manifest.length + 1).padStart(3, "0")}-${asset.sha256.slice(0, 10)}.${asset.extension}`;
    const destination = join(output, name);
    writeFileSync(destination, asset.data);

    try {
      const image = await loadImage(asset.data);
      const transparency = analyzeTransparency(image);
      const entry = {
        name,
        extension: asset.extension,
        source,
        sourceOffset: asset.offset,
        sha256: asset.sha256,
        bytes: asset.data.length,
        width: image.width,
        height: image.height,
        ...transparency,
      };
      manifest.push({ ...entry, likelyCharacter: isLikelyCharacterAsset(entry) });
    } catch {
      manifest.push({ name, source, sourceOffset: asset.offset, sha256: asset.sha256, bytes: asset.data.length });
    }
  }
}

writeFileSync(join(output, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ files: files.length, assets: manifest.length, output, manifest }, null, 2));
