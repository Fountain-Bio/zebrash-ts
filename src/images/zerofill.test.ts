import { ImageData, createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";
import { zerofill } from "./zerofill.ts";

describe("zerofill", () => {
  it("zeros every channel on a canvas", () => {
    const canvas = createCanvas(4, 3);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(255, 0, 0, 1)";
    ctx.fillRect(0, 0, 4, 3);

    zerofill(canvas);

    const after = ctx.getImageData(0, 0, 4, 3);
    for (let i = 0; i < after.data.length; i++) {
      expect(after.data[i]).toBe(0);
    }
  });

  it("zeros an ImageData buffer in place", () => {
    const data = new Uint8ClampedArray(2 * 2 * 4);
    data.fill(200);
    const img = new ImageData(data, 2, 2);

    zerofill(img);

    for (let i = 0; i < img.data.length; i++) {
      expect(img.data[i]).toBe(0);
    }
  });
});
