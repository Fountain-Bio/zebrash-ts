/**
 * Browser implementation of the Platform interface — uses native
 * `OffscreenCanvas`, `createImageBitmap`, and `FontFace`.
 */

import type { Platform, PlatformCanvas, PlatformImageSource } from "./types.ts";

const registeredFamilies = new Set<string>();

export const platform: Platform = {
  createCanvas(width: number, height: number): PlatformCanvas {
    return new OffscreenCanvas(width, height) as unknown as PlatformCanvas;
  },

  async encodePng(canvas: PlatformCanvas): Promise<Uint8Array> {
    type WithBlob = { convertToBlob(opts?: { type?: string }): Promise<Blob> };
    const blob = await (canvas as unknown as WithBlob).convertToBlob({ type: "image/png" });
    return new Uint8Array(await blob.arrayBuffer());
  },

  async loadImage(data: Uint8Array): Promise<PlatformImageSource> {
    const blob = new Blob([data as BlobPart], { type: "application/octet-stream" });
    return await createImageBitmap(blob);
  },

  async registerFont(data: Uint8Array, family: string): Promise<void> {
    if (registeredFamilies.has(family)) return;
    const face = new FontFace(family, data as BufferSource);
    await face.load();
    // `document.fonts` is available in all browser contexts with a DOM;
    // workers use `self.fonts` instead — fall back if `document` is undefined.
    const fonts =
      typeof document !== "undefined"
        ? document.fonts
        : (globalThis as unknown as { fonts: FontFaceSet }).fonts;
    fonts.add(face);
    registeredFamilies.add(family);
  },

  createImageData(data: Uint8ClampedArray, width: number, height: number): ImageData {
    return new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>, width, height);
  },
};
