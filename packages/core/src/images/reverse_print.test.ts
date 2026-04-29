import { platform } from "../platform.ts";
const createCanvas = platform.createCanvas.bind(platform);
import { describe, expect, it } from "vitest";

import { reversePrint } from "./reverse_print.ts";

function solidImage(w: number, h: number, rgba: readonly [number, number, number, number]) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = rgba[0];
    data[i + 1] = rgba[1];
    data[i + 2] = rgba[2];
    data[i + 3] = rgba[3];
  }
  return platform.createImageData(data, w, h);
}

describe("reversePrint", () => {
  it("inverts dst RGB only where the mask alpha is at least 30", () => {
    const mask = solidImage(4, 4, [0, 0, 0, 0]);
    // Punch an opaque-black 2x2 square at (1,1).
    for (let y = 1; y <= 2; y++) {
      for (let x = 1; x <= 2; x++) {
        const idx = (y * 4 + x) * 4;
        mask.data[idx + 3] = 255;
      }
    }

    const dst = solidImage(4, 4, [200, 100, 50, 255]);
    reversePrint(mask, dst);

    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const idx = (y * 4 + x) * 4;
        const inside = x >= 1 && x <= 2 && y >= 1 && y <= 2;
        const want = inside ? [55, 155, 205, 255] : [200, 100, 50, 255];
        expect([dst.data[idx], dst.data[idx + 1], dst.data[idx + 2], dst.data[idx + 3]]).toEqual(
          want,
        );
      }
    }
  });

  it("ignores mask pixels below the alpha threshold", () => {
    const mask = solidImage(2, 1, [0, 0, 0, 29]);
    const dst = solidImage(2, 1, [10, 20, 30, 255]);
    reversePrint(mask, dst);
    expect(Array.from(dst.data)).toEqual([10, 20, 30, 255, 10, 20, 30, 255]);
  });

  it("works with Canvas inputs", () => {
    const mask = createCanvas(2, 2);
    const mctx = mask.getContext("2d")!;
    mctx.fillStyle = "rgba(0, 0, 0, 1)";
    mctx.fillRect(0, 0, 1, 2);

    const dst = createCanvas(2, 2);
    const dctx = dst.getContext("2d")!;
    dctx.fillStyle = "rgb(0, 0, 0)";
    dctx.fillRect(0, 0, 2, 2);

    reversePrint(mask, dst);

    const out = dctx.getImageData(0, 0, 2, 2).data;
    // Left column flipped to white, right column stays black.
    expect([out[0], out[1], out[2]]).toEqual([255, 255, 255]);
    expect([out[4], out[5], out[6]]).toEqual([0, 0, 0]);
    expect([out[8], out[9], out[10]]).toEqual([255, 255, 255]);
    expect([out[12], out[13], out[14]]).toEqual([0, 0, 0]);
  });

  it("throws on size mismatch", () => {
    const mask = solidImage(2, 2, [0, 0, 0, 255]);
    const dst = solidImage(3, 2, [0, 0, 0, 255]);
    expect(() => reversePrint(mask, dst)).toThrow(/size mismatch/);
  });
});
