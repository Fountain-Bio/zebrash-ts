import { createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { Drawer } from "./drawer.ts";
import { Parser } from "./parser.ts";

describe("Drawer ^POI handling", () => {
  const opts = {
    labelWidthMm: 50.8,
    labelHeightMm: 25.4,
    dpmm: 8,
    enableInvertedLabels: true,
  };
  const baseline = `^XA^PW400^LH0,0^FO50,50^A0N,40,40^FDHELLO^FS^XZ`;
  const inverted = `^XA^POI^PW400^LH0,0^FO50,50^A0N,40,40^FDHELLO^FS^XZ`;

  function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  it("rotates PNG output 180° when enableInvertedLabels is true", async () => {
    const drawer = new Drawer();
    const parser = new Parser();
    const a = parser.parse(baseline)[0];
    const b = parser.parse(inverted)[0];
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(b!.inverted).toBe(true);

    const pngA = await drawer.drawLabelAsPng(a!, opts);
    const pngB = await drawer.drawLabelAsPng(b!, opts);
    expect(bytesEqual(pngA, pngB)).toBe(false);
  });

  it("ignores ^POI when enableInvertedLabels is false (parity with Go)", async () => {
    const drawer = new Drawer();
    const parser = new Parser();
    const a = parser.parse(baseline)[0];
    const b = parser.parse(inverted)[0];
    const off = { ...opts, enableInvertedLabels: false };

    const pngA = await drawer.drawLabelAsPng(a!, off);
    const pngB = await drawer.drawLabelAsPng(b!, off);
    expect(bytesEqual(pngA, pngB)).toBe(true);
  });
});

// Canary for the @napi-rs/canvas spec violation that drawer.ts works around
// (the `setTransform(1,0,0,1,0,0)` reset before encode). The HTML5 Canvas
// spec is unambiguous: putImageData ignores the active transform. Browsers
// follow the spec; @napi-rs/canvas (as of writing) does not.
//
// If this test starts FAILING — meaning napi-rs has fixed putImageData to
// ignore the transform — the workaround in drawer.ts:148-152 is no longer
// needed. Delete the `setTransform(1,0,0,1,0,0)` line and this whole
// describe block.
describe("@napi-rs/canvas putImageData transform-respecting canary", () => {
  it("currently violates spec: putImageData applies the active transform", () => {
    const c = createCanvas(20, 20);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 20, 20);
    ctx.fillStyle = "black";
    ctx.fillRect(15, 15, 5, 5);
    ctx.translate(20, 20);
    ctx.scale(-1, -1);
    const img = ctx.getImageData(0, 0, 20, 20);
    ctx.putImageData(img, 0, 0);

    const after = ctx.getImageData(0, 0, 20, 20).data;
    const isBlack = (x: number, y: number): boolean => (after[(y * 20 + x) * 4] ?? 255) < 128;

    // Spec-correct behavior would leave the ink at (15,15)–(19,19) (transform
    // ignored). Today napi flips it to (0,0)–(4,4). When napi is fixed,
    // these assertions will reverse and the test will fail — that is the
    // signal to remove the drawer.ts workaround.
    expect(isBlack(2, 2), "napi-rs/canvas putImageData appears spec-correct now").toBe(true);
    expect(isBlack(17, 17), "napi-rs/canvas putImageData appears spec-correct now").toBe(false);
  });
});
