import { ImageData } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { scaled } from "./scaled.ts";

function makeImage(width: number, height: number, pixels: ReadonlyArray<readonly number[]>) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i++) {
    const px = pixels[i] ?? [0, 0, 0, 0];
    const base = i * 4;
    data[base] = px[0] ?? 0;
    data[base + 1] = px[1] ?? 0;
    data[base + 2] = px[2] ?? 0;
    data[base + 3] = px[3] ?? 0;
  }
  return new ImageData(data, width, height);
}

describe("scaled", () => {
  it("returns a fresh copy when both scale factors are 1", () => {
    const src = makeImage(2, 2, [
      [10, 20, 30, 40],
      [50, 60, 70, 80],
      [90, 100, 110, 120],
      [130, 140, 150, 160],
    ]);
    const out = scaled(src, 1, 1);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect(Array.from(out.data)).toEqual(Array.from(src.data));
    expect(out.data).not.toBe(src.data);
  });

  it("upscales 2x2 → 4x4 with nearest-neighbor at scale 2", () => {
    const black = [0, 0, 0, 255];
    const white = [255, 255, 255, 255];
    const src = makeImage(2, 2, [black, white, white, black]);

    const out = scaled(src, 2, 2);
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);

    const expectedRows = [
      [black, black, white, white],
      [black, black, white, white],
      [white, white, black, black],
      [white, white, black, black],
    ];
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const idx = (y * 4 + x) * 4;
        const want = expectedRows[y]?.[x] ?? black;
        expect([out.data[idx], out.data[idx + 1], out.data[idx + 2], out.data[idx + 3]]).toEqual(
          want,
        );
      }
    }
  });

  it("supports asymmetric integer scale factors", () => {
    const src = makeImage(2, 1, [
      [10, 0, 0, 255],
      [200, 0, 0, 255],
    ]);
    const out = scaled(src, 3, 2);
    expect(out.width).toBe(6);
    expect(out.height).toBe(2);
    // Row 0 and 1 should both be: 10,10,10,200,200,200 in the red channel.
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 6; x++) {
        const r = out.data[(y * 6 + x) * 4];
        expect(r).toBe(x < 3 ? 10 : 200);
      }
    }
  });

  it("rejects non-integer or non-positive scale factors", () => {
    const src = makeImage(1, 1, [[0, 0, 0, 255]]);
    expect(() => scaled(src, 0, 1)).toThrow();
    expect(() => scaled(src, 1.5, 1)).toThrow();
    expect(() => scaled(src, 1, -2)).toThrow();
  });
});
