import { describe, expect, it } from "vitest";
import { selectPrintableFaces, type PrintableFace } from "./printable-faces";

const canudoFaces: PrintableFace[] = [
  { x: 778, y: 171, w: 480, h: 599, area: 255021, cx: 1017.5, cy: 470 },
  { x: 1798, y: 171, w: 480, h: 599, area: 254821, cx: 2037.5, cy: 470 },
  { x: 1277, y: 777, w: 504, h: 505, area: 237746, cx: 1528.5, cy: 1029 },
  { x: 771, y: 778, w: 498, h: 504, area: 235627, cx: 1019.5, cy: 1029.5 },
  { x: 261, y: 778, w: 495, h: 503, area: 235227, cx: 508, cy: 1029 },
  { x: 1788, y: 778, w: 490, h: 504, area: 234421, cx: 2032.5, cy: 1029.5 },
  { x: 1288, y: 1289, w: 480, h: 322, area: 122045, cx: 1527.5, cy: 1449.5 },
  { x: 270, y: 467, w: 476, h: 303, area: 117886, cx: 507.5, cy: 618 },
  { x: 1290, y: 467, w: 476, h: 303, area: 117792, cx: 1527.5, cy: 618 },
  { x: 273, y: 1289, w: 469, h: 319, area: 107015, cx: 507, cy: 1448 },
  { x: 1848, y: 1289, w: 430, h: 248, area: 67997, cx: 2062.5, cy: 1412.5 },
  { x: 778, y: 1289, w: 426, h: 248, area: 67957, cx: 990.5, cy: 1412.5 },
  { x: 165, y: 797, w: 78, h: 467, area: 31761, cx: 203.5, cy: 1030 },
];

describe("selecao das faces imprimiveis", () => {
  it("remove alcas e abas da Caixa Canudo", () => {
    const selected = selectPrintableFaces(canudoFaces, 2526, 1786);

    expect(selected).toHaveLength(4);
    expect(selected.map((face) => face.y)).toEqual([778, 778, 777, 778]);
    expect(selected.every((face) => face.h >= 503 && face.h <= 505)).toBe(true);
  });

  it("descarta regioes estreitas sobrepostas da fileira principal", () => {
    const faces = [
      ...Array.from({ length: 4 }, (_, index) => ({
        x: index * 100,
        y: 80,
        w: 100,
        h: 120,
        cx: index * 100 + 50,
        cy: 140,
        area: 12000,
      })),
      { x: 4, y: 85, w: 12, h: 110, cx: 10, cy: 140, area: 1320 },
    ];

    expect(selectPrintableFaces(faces, 400, 240)).toHaveLength(4);
  });
});
