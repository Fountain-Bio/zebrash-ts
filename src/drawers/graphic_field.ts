// Mirrors internal/drawers/graphic_field.go
import { createCanvas } from "@napi-rs/canvas";
import type { GraphicField } from "../elements/graphic_field.ts";
import type { ElementDrawer } from "./element_drawer.ts";

function isGraphicField(value: unknown): value is GraphicField {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { kind?: unknown }).kind === "graphic_field"
  );
}

export function newGraphicFieldDrawer(): ElementDrawer {
  return {
    draw: (ctx, element) => {
      if (!isGraphicField(element)) {
        return;
      }

      const dataLen =
        element.totalBytes > 0
          ? Math.min(element.totalBytes, element.data.length)
          : element.data.length;

      const width = element.rowBytes * 8;
      const height = element.rowBytes > 0 ? Math.floor(dataLen / element.rowBytes) : 0;

      if (width <= 0 || height <= 0) {
        return;
      }

      const magX = Math.max(1, element.magnificationX);
      const magY = Math.max(1, element.magnificationY);

      const dstW = width * magX;
      const dstH = height * magY;

      // Render into an offscreen canvas so unset pixels stay transparent
      // and the final drawImage composites with the destination (matching
      // Go's image.NewRGBA + DrawImage source-over behavior).
      const offscreen = createCanvas(dstW, dstH);
      const offCtx = offscreen.getContext("2d");
      const imageData = offCtx.createImageData(dstW, dstH);
      const buf = imageData.data;

      // Each source pixel is one bit; iterate destination rows/columns and
      // map back to source coordinates via integer division by magnification.
      for (let dy = 0; dy < dstH; dy++) {
        const sy = Math.floor(dy / magY);
        const rowOff = sy * element.rowBytes;
        for (let dx = 0; dx < dstW; dx++) {
          const sx = Math.floor(dx / magX);
          const idx = rowOff + (sx >>> 3);
          if (idx >= element.data.length) {
            continue;
          }

          const byte = element.data[idx] ?? 0;
          const bit = (byte >> (7 - (sx & 7))) & 1;
          if (bit === 0) {
            continue;
          }

          const off = (dy * dstW + dx) * 4;
          buf[off] = 0;
          buf[off + 1] = 0;
          buf[off + 2] = 0;
          buf[off + 3] = 255;
        }
      }

      offCtx.putImageData(imageData, 0, 0);
      ctx.drawImage(offscreen, element.position.x, element.position.y);
    },
  };
}
