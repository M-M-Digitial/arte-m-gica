import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { prepareCharacterPng } from "./prepare-character.mjs";

test("remove margens transparentes e respeita a dimensao maxima", async () => {
  const source = createCanvas(400, 300);
  const context = source.getContext("2d");
  context.fillStyle = "#ff0000";
  context.fillRect(100, 50, 200, 200);

  const prepared = await prepareCharacterPng(source.toBuffer("image/png"), 120);
  const image = await loadImage(prepared.buffer);

  assert.equal(Math.max(image.width, image.height), 120);
  assert.ok(image.width >= 115 && image.height >= 115);
  assert.equal(prepared.sourceWidth, 400);
  assert.equal(prepared.sourceHeight, 300);
});
