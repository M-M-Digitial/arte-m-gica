import { describe, expect, it } from "vitest";
import { calculateVisibleCoverScale } from "./cover-framing";

const pixels = (width: number, height: number, box: [number, number, number, number]) => {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = box[1]; y <= box[3]; y++) {
    for (let x = box[0]; x <= box[2]; x++) rgba[(y * width + x) * 4 + 3] = 255;
  }
  return rgba;
};

describe("enquadramento de capas transparentes", () => {
  it("mantem personagens que ja ocupam bem o quadro", () => {
    expect(calculateVisibleCoverScale(pixels(64, 64, [7, 5, 57, 59]), 64, 64)).toBe(1);
  });

  it("amplia artes pequenas sem ultrapassar o limite seguro", () => {
    expect(calculateVisibleCoverScale(pixels(64, 64, [23, 22, 40, 41]), 64, 64)).toBe(1.85);
  });
});
