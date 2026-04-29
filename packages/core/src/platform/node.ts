/**
 * Node implementation of the Platform interface — uses `@napi-rs/canvas`
 * for canvas, image, and font operations.
 */

import { GlobalFonts, ImageData as NapiImageData, createCanvas, loadImage } from "@napi-rs/canvas";
import { Buffer } from "node:buffer";

import type { Platform, PlatformCanvas, PlatformImageSource } from "./types.ts";

const registeredFamilies = new Set<string>();

export const platform: Platform = {
  createCanvas(width: number, height: number): PlatformCanvas {
    return createCanvas(width, height) as unknown as PlatformCanvas;
  },

  async encodePng(canvas: PlatformCanvas): Promise<Uint8Array> {
    type WithEncode = { encode(format: "png"): Promise<Buffer> };
    const buf = await (canvas as unknown as WithEncode).encode("png");
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  },

  async loadImage(data: Uint8Array): Promise<PlatformImageSource> {
    const img = await loadImage(Buffer.from(data));
    return img as unknown as PlatformImageSource;
  },

  async registerFont(data: Uint8Array, family: string): Promise<void> {
    if (registeredFamilies.has(family)) return;
    GlobalFonts.register(Buffer.from(data), family);
    registeredFamilies.add(family);
  },

  createImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
    return new NapiImageData(data, width, height) as unknown as ImageData;
  },
};
