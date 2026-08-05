import { createHash } from "node:crypto";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);
const PNG_END = Buffer.from("IEND", "ascii");

function findPngEnd(buffer, start) {
  let cursor = start + PNG_SIGNATURE.length;

  while (cursor + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(cursor);
    const typeStart = cursor + 4;
    const chunkEnd = cursor + 12 + length;
    if (chunkEnd > buffer.length) return -1;
    if (buffer.subarray(typeStart, typeStart + 4).equals(PNG_END)) return chunkEnd;
    cursor = chunkEnd;
  }

  return -1;
}

function findJpegEnd(buffer, start) {
  for (let cursor = start + JPEG_SIGNATURE.length; cursor + 1 < buffer.length; cursor += 1) {
    if (buffer[cursor] === 0xff && buffer[cursor + 1] === 0xd9) return cursor + 2;
  }
  return -1;
}

function pushUnique(assets, seen, data, extension, offset) {
  const sha256 = createHash("sha256").update(data).digest("hex");
  if (seen.has(sha256)) return;
  seen.add(sha256);
  assets.push({ data, extension, offset, sha256 });
}

export function extractStudioAssets(buffer) {
  const assets = [];
  const seen = new Set();

  for (let cursor = 0; cursor < buffer.length;) {
    const pngStart = buffer.indexOf(PNG_SIGNATURE, cursor);
    const jpegStart = buffer.indexOf(JPEG_SIGNATURE, cursor);
    const starts = [pngStart, jpegStart].filter((offset) => offset >= 0);
    if (!starts.length) break;

    const start = Math.min(...starts);
    if (start === pngStart) {
      const end = findPngEnd(buffer, start);
      if (end > start) {
        pushUnique(assets, seen, buffer.subarray(start, end), "png", start);
        cursor = end;
        continue;
      }
    } else {
      const end = findJpegEnd(buffer, start);
      if (end > start) {
        pushUnique(assets, seen, buffer.subarray(start, end), "jpg", start);
        cursor = end;
        continue;
      }
    }

    cursor = start + 1;
  }

  return assets;
}
