import { createCanvas, loadImage } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { encodeGrayscale, encodeMonochrome } from "./encode.ts";

describe("encodeMonochrome", () => {
  it("thresholds a mid-gray fill to white and round-trips through PNG", async () => {
    const canvas = createCanvas(8, 8);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(200, 200, 200)";
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = "rgb(50, 50, 50)";
    ctx.fillRect(0, 0, 4, 8);

    const png = await encodeMonochrome(canvas);
    expect(png.length).toBeGreaterThan(0);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");

    const img = await loadImage(png);
    const decoded = createCanvas(img.width, img.height);
    const dctx = decoded.getContext("2d");
    dctx.drawImage(img, 0, 0);
    const data = dctx.getImageData(0, 0, img.width, img.height).data;

    expect(data[0]).toBe(0);
    expect(data[1]).toBe(0);
    expect(data[2]).toBe(0);
    const rightStart = (4 + 0 * img.width) * 4;
    expect(data[rightStart]).toBe(255);
    expect(data[rightStart + 1]).toBe(255);
    expect(data[rightStart + 2]).toBe(255);
  });
});

describe("encodeGrayscale", () => {
  it("preserves the red-channel intensity as luma and round-trips through PNG", async () => {
    const canvas = createCanvas(4, 4);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(123, 200, 50)";
    ctx.fillRect(0, 0, 4, 4);

    const png = await encodeGrayscale(canvas);
    expect(png.length).toBeGreaterThan(0);

    const img = await loadImage(png);
    const decoded = createCanvas(img.width, img.height);
    const dctx = decoded.getContext("2d");
    dctx.drawImage(img, 0, 0);
    const data = dctx.getImageData(0, 0, img.width, img.height).data;

    // Red channel was 123; grayscale output should have R=G=B=123 (matching Go).
    expect(data[0]).toBe(123);
    expect(data[1]).toBe(123);
    expect(data[2]).toBe(123);
    expect(data[3]).toBe(255);
  });
});
