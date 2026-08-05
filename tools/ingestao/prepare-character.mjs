import { createCanvas, loadImage } from "@napi-rs/canvas";

export async function prepareCharacterPng(input, maxDimension = 1800) {
  const image = await loadImage(input);
  const source = createCanvas(image.width, image.height);
  const sourceContext = source.getContext("2d");
  sourceContext.drawImage(image, 0, 0);
  const pixels = sourceContext.getImageData(0, 0, image.width, image.height).data;
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (pixels[(y * image.width + x) * 4 + 3] <= 16) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) throw new Error("Imagem sem pixels visiveis.");

  const padding = Math.max(2, Math.round(Math.max(image.width, image.height) * 0.008));
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(image.width - 1, maxX + padding);
  maxY = Math.min(image.height - 1, maxY + padding);
  const cropWidth = maxX - minX + 1;
  const cropHeight = maxY - minY + 1;
  const scale = Math.min(1, maxDimension / Math.max(cropWidth, cropHeight));
  const width = Math.max(1, Math.round(cropWidth * scale));
  const height = Math.max(1, Math.round(cropHeight * scale));
  const output = createCanvas(width, height);
  const outputContext = output.getContext("2d");
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(source, minX, minY, cropWidth, cropHeight, 0, 0, width, height);

  return {
    buffer: output.toBuffer("image/png"),
    width,
    height,
    sourceWidth: image.width,
    sourceHeight: image.height,
  };
}
