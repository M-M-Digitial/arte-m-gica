import { selectPrintableFaces, toSafePrintableFace, type PrintableFace } from "./printable-faces.ts";

export interface ArtLabelZone { x: number; y: number; w: number; h: number; rotation: number; cx: number; cy: number }
export interface ArtLayout { width: number; height: number; labels: ArtLabelZone[] }

export function buildArtLayout(data: { width: number; height: number; faces: PrintableFace[] }, mold: string): ArtLayout {
  if (!data || !Array.isArray(data.faces) || ![data.width, data.height].every((n) => Number.isFinite(n) && n > 0)) {
    throw new Error("O molde nao tem mapa de faces seguro.");
  }
  const faces = selectPrintableFaces(data.faces, data.width, data.height, mold).map(toSafePrintableFace);
  const milk = /milk/i.test(mold);
  const chosen = milk && faces.length >= 4 ? [faces[0], faces[faces.length - 1]] : faces.slice(0, 2);
  const labels = chosen.map((face) => ({
    x: (face.x + face.w * 0.10) / data.width,
    y: (face.y + face.h * 0.67) / data.height,
    w: face.w * 0.80 / data.width,
    h: face.h * 0.29 / data.height,
    rotation: face.safeRotation ?? 0,
    cx: face.cx / data.width,
    cy: face.cy / data.height,
  }));
  const layout = { width: data.width, height: data.height, labels };
  if (!isArtLayout(layout)) throw new Error("A area segura de personalizacao deste molde e invalida.");
  return layout;
}

export function isArtLayout(value: unknown): value is ArtLayout {
  const v = value as ArtLayout | null;
  return !!v && [v.width, v.height].every((n) => Number.isFinite(n) && n > 0 && n <= 16000)
    && Array.isArray(v.labels) && v.labels.length > 0 && v.labels.length <= 6
    && v.labels.every((z) => [z.x, z.y, z.w, z.h, z.rotation, z.cx, z.cy].every(Number.isFinite)
      && z.x >= 0 && z.y >= 0 && z.w > 0 && z.h > 0 && z.x + z.w <= 1 && z.y + z.h <= 1
      && Math.abs(z.rotation) <= 360 && z.cx >= 0 && z.cx <= 1 && z.cy >= 0 && z.cy <= 1);
}

export function describeArtLayout(layout: ArtLayout) {
  return `AREAS RESERVADAS PARA TEXTO POSTERIOR, em porcentagem da pagina, origem canto superior esquerdo: ${layout.labels.map((z, i) =>
    `area ${i + 1}: x=${(z.x * 100).toFixed(2)}%, y=${(z.y * 100).toFixed(2)}%, largura=${(z.w * 100).toFixed(2)}%, altura=${(z.h * 100).toFixed(2)}%, rotacao=${z.rotation} graus em torno de (${(z.cx * 100).toFixed(2)}%, ${(z.cy * 100).toFixed(2)}%)`).join("; ")}.
Deixar esses retangulos calmos, sem personagem, rosto, flor focal, numeros ou letras. O sistema aplicara placas e textos EXATOS nessas areas. Nao desenhar placa, borda, texto, monograma ou placeholder. Compor os personagens ACIMA ou AO LADO dessas areas, nunca atras delas.`;
}
