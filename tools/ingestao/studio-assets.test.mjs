import assert from "node:assert/strict";
import test from "node:test";
import { createCanvas } from "@napi-rs/canvas";
import { extractStudioAssets } from "./studio-assets.mjs";

const png = createCanvas(1, 1).toBuffer("image/png");
const jpeg = Buffer.from("ffd8ffe000104a46494600010100000100010000ffd9", "hex");

test("extrai PNG e JPEG incorporados sem duplicar", () => {
  const source = Buffer.concat([Buffer.from("silhouette05;"), png, Buffer.from("gap"), jpeg, png]);
  const assets = extractStudioAssets(source);

  assert.equal(assets.length, 2);
  assert.equal(assets[0].extension, "png");
  assert.deepEqual(assets[0].data, png);
  assert.equal(assets[1].extension, "jpg");
  assert.deepEqual(assets[1].data, jpeg);
});
