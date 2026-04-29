// SVG analogue of `drawers/graphic_field.ts`. The only drawer that requires
// raster: the input is a packed-bit bitmap with no geometric structure to
// preserve, so we re-rasterise into a canvas and embed the PNG bytes as a
// data URL `<image>`.

import type { GraphicField } from "../elements/graphic_field.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { platform } from "../platform.ts";

function isGraphicField(value: unknown): value is GraphicField {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "GraphicField"
  );
}

export function newGraphicFieldSvgDrawer(): SvgElementDrawer {
  return {
    async draw(emitter: SvgEmitter, element: unknown): Promise<void> {
      if (!isGraphicField(element)) return;

      const dataLen =
        element.totalBytes > 0
          ? Math.min(element.totalBytes, element.data.length)
          : element.data.length;

      const width = element.rowBytes * 8;
      const height = element.rowBytes > 0 ? Math.floor(dataLen / element.rowBytes) : 0;
      if (width <= 0 || height <= 0) return;

      const magX = Math.max(1, element.magnificationX);
      const magY = Math.max(1, element.magnificationY);
      const dstW = width * magX;
      const dstH = height * magY;

      // Identical bit-unpack loop to the canvas drawer; the resulting canvas
      // becomes the source for an embedded PNG.
      const offscreen = platform.createCanvas(dstW, dstH);
      const offCtx = offscreen.getContext("2d");
      if (offCtx === null) throw new Error("zebrash: failed to acquire 2D context for ^GF");
      const imageData = offCtx.createImageData(dstW, dstH);
      const buf = imageData.data;

      for (let dy = 0; dy < dstH; dy++) {
        const sy = Math.floor(dy / magY);
        const rowOff = sy * element.rowBytes;
        for (let dx = 0; dx < dstW; dx++) {
          const sx = Math.floor(dx / magX);
          const idx = rowOff + (sx >>> 3);
          if (idx >= element.data.length) continue;

          const byte = element.data[idx] ?? 0;
          const bit = (byte >> (7 - (sx & 7))) & 1;
          if (bit === 0) continue;

          const off = (dy * dstW + dx) * 4;
          buf[off] = 0;
          buf[off + 1] = 0;
          buf[off + 2] = 0;
          buf[off + 3] = 255;
        }
      }
      offCtx.putImageData(imageData, 0, 0);

      const pngBytes = await platform.encodePng(offscreen);
      const href = `data:image/png;base64,${base64Encode(pngBytes)}`;

      emitter.image(href, element.position.x, element.position.y, dstW, dstH);
    },
  };
}

function base64Encode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(bin);
}
