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
