import { GlobalFonts, createCanvas } from "@napi-rs/canvas";
import { describe, expect, it } from "vitest";

import { EmbeddedFontFamilies, registerEmbeddedFonts } from "./register.ts";

describe("registerEmbeddedFonts", () => {
  it("registers all four embedded font families", async () => {
    await registerEmbeddedFonts();

    expect(GlobalFonts.has(EmbeddedFontFamilies.HelveticaBold)).toBe(true);
    expect(GlobalFonts.has(EmbeddedFontFamilies.DejavuSansMono)).toBe(true);
    expect(GlobalFonts.has(EmbeddedFontFamilies.DejavuSansMonoBold)).toBe(true);
    expect(GlobalFonts.has(EmbeddedFontFamilies.ZplGS)).toBe(true);
  });

  it("is idempotent across repeated calls", async () => {
    await registerEmbeddedFonts();
    await registerEmbeddedFonts();
    await registerEmbeddedFonts();

    expect(GlobalFonts.has(EmbeddedFontFamilies.HelveticaBold)).toBe(true);
  });

  it("returns the family-name mapping for callers", async () => {
    const families = await registerEmbeddedFonts();

    expect(families).toBe(EmbeddedFontFamilies);
    expect(families.HelveticaBold).toBe("ZebrashHelveticaBold");
    expect(families.DejavuSansMono).toBe("ZebrashDejavuSansMono");
    expect(families.DejavuSansMonoBold).toBe("ZebrashDejavuSansMonoBold");
    expect(families.ZplGS).toBe("ZebrashZplGS");
  });

  it("renders text with a registered font to a non-trivial PNG", async () => {
    const families = await registerEmbeddedFonts();

    const canvas = createCanvas(100, 40);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 100, 40);
    ctx.fillStyle = "black";
    ctx.font = `20px "${families.HelveticaBold}"`;
    ctx.fillText("Hi", 10, 28);

    const png = canvas.toBuffer("image/png");
    expect(png.length).toBeGreaterThan(200);
  });
});
