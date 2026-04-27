// Port of bitlist_image.go — pure-logic counterpart.
//
// The Go original returns an image.Image. To keep this leaf module free of canvas/IO,
// we expose a pure helper that produces the 1-pixel-tall pixel row plus the target
// height. The image module (unit 3) lifts the row to a full image.

import type { BitList } from "./bitlist.ts";
import { toWideNarrowList } from "./bitlist_widenarrow.ts";

export interface BitListImageRow {
  // pixels[x] is true when the bar at column x is "on" (drawn).
  pixels: Uint8Array;
  // Target height the row should be scaled to.
  height: number;
}

// Computes the per-pixel boolean row for a wide/narrow barcode. `widthRatio` is clamped to [2, 3]
// to match the Go implementation.
export function bitListToImageRow(
  resBits: BitList,
  width: number,
  height: number,
  widthRatio: number,
): BitListImageRow {
  const ratio = Math.max(Math.min(3, widthRatio), 2);
  const wideBarWidth = Math.round(ratio * width);

  const barsList = toWideNarrowList(resBits, wideBarWidth, width);

  const totalWidth = barsList.getTotalWidth();
  const pixels = new Uint8Array(totalWidth);

  let px = 0;
  for (let i = 0; i < barsList.data.length; i++) {
    const isOn = barsList.data[i]![1];
    const w = barsList.getBarWidth(i);
    if (isOn) {
      for (let k = 0; k < w; k++) {
        pixels[px + k] = 1;
      }
    }
    px += w;
  }

  return { pixels, height };
}
