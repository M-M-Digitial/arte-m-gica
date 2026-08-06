export interface PrintableFace {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
  area: number;
  safeX?: number;
  safeY?: number;
  safeW?: number;
  safeH?: number;
  safeRotation?: number;
}

const normalizeProductName = (value = "") => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase();

export function toSafePrintableFace(face: PrintableFace): PrintableFace {
  const safeValues = [face.safeX, face.safeY, face.safeW, face.safeH];
  const hasSafeRectangle = safeValues.every(Number.isFinite)
    && (face.safeW ?? 0) > 0
    && (face.safeH ?? 0) > 0;
  if (!hasSafeRectangle) return face;

  const x = face.safeX!;
  const y = face.safeY!;
  const w = face.safeW!;
  const h = face.safeH!;
  return {
    ...face,
    x,
    y,
    w,
    h,
    cx: x + w / 2,
    cy: y + h / 2,
    area: w * h,
  };
}

const verticalOverlap = (a: PrintableFace, b: PrintableFace) =>
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

const overlapRatio = (a: PrintableFace, b: PrintableFace) => {
  const overlapW = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const overlapH = verticalOverlap(a, b);
  const smallerBox = Math.min(a.w * a.h, b.w * b.h);
  return smallerBox > 0 ? (overlapW * overlapH) / smallerBox : 0;
};

function removeNestedRegions(faces: PrintableFace[]): PrintableFace[] {
  const selected: PrintableFace[] = [];
  for (const face of faces.slice().sort((a, b) => b.area - a.area)) {
    if (selected.some((candidate) => overlapRatio(candidate, face) >= 0.46)) continue;
    selected.push(face);
  }
  return selected;
}

function removeTinySafeRegions(faces: PrintableFace[]): PrintableFace[] {
  if (faces.length <= 1) return faces;
  const largestSafeArea = Math.max(...faces.map((face) => toSafePrintableFace(face).area));
  const useful = faces.filter((face) => toSafePrintableFace(face).area >= largestSafeArea * 0.20);
  return useful.length ? useful : faces;
}

export function selectPrintableFaces(
  faces: PrintableFace[],
  canvasWidth: number,
  canvasHeight: number,
  moldName = "",
): PrintableFace[] {
  const valid = faces.filter((face) =>
    [face.x, face.y, face.w, face.h, face.cx, face.cy, face.area].every(Number.isFinite) &&
    face.w > 0 && face.h > 0 && face.area > 0,
  );
  if (valid.length <= 1) return valid;

  const normalizedName = normalizeProductName(moldName);
  if (normalizedName.includes("forminha")) {
    return valid
      .slice()
      .sort((a, b) => b.area - a.area)
      .slice(0, 6)
      .sort((a, b) => a.x - b.x || a.y - b.y);
  }
  if (normalizedName.includes("piramide")) {
    return valid
      .slice()
      .sort((a, b) => b.area - a.area)
      .slice(0, 5)
      .sort((a, b) => a.x - b.x || a.y - b.y);
  }

  const maxArea = Math.max(...valid.map((face) => face.area));
  const candidates = valid.filter((face) =>
    face.area >= maxArea * 0.12 &&
    face.w >= canvasWidth * 0.09 &&
    face.h >= canvasHeight * 0.12,
  );
  if (candidates.length <= 1) return candidates.length ? candidates : [valid[0]];

  let winner: PrintableFace[] = [];
  let winnerScore = -1;
  for (const seed of candidates) {
    const band = candidates.filter((face) => {
      const overlap = verticalOverlap(seed, face) / Math.min(seed.h, face.h);
      const heightRatio = Math.max(seed.h, face.h) / Math.min(seed.h, face.h);
      return overlap >= 0.68 && heightRatio <= 1.85;
    });
    const distinct = removeNestedRegions(band);
    const left = Math.min(...distinct.map((face) => face.x));
    const right = Math.max(...distinct.map((face) => face.x + face.w));
    const horizontalCoverage = Math.min(1, (right - left) / canvasWidth);
    const totalArea = distinct.reduce((sum, face) => sum + face.area, 0);
    const countWeight = 1 + Math.min(distinct.length, 6) * 0.22;
    const score = totalArea * countWeight * (0.72 + horizontalCoverage * 0.55);
    if (score > winnerScore) {
      winner = distinct;
      winnerScore = score;
    }
  }

  return removeTinySafeRegions(winner)
    .slice(0, 6)
    .sort((a, b) => a.x - b.x || a.y - b.y);
}
