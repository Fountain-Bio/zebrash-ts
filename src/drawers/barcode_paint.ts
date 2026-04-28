// Shared painting helpers for the unit-23 barcode drawers.

import type { BitMatrix } from "../barcodes/utils/index.js";
import type { LabelPosition } from "../elements/index.js";

import { FONT0_NAME, FONT1_NAME, registerEmbeddedFonts } from "../assets/index.js";

/** Minimal shape for any 1D bit sequence painter input. */
export interface BitSequence {
  readonly length: number;
  at(i: number): boolean | undefined;
}

/**
 * Walk a 1D bit pattern and paint vertical bars `moduleWidth` wide and
 * `barHeight` tall, starting at `pos`. Accepts any object exposing `length`
 * and `at(i): boolean` (BitArray, BitList, boolean[], EncodedCode128, ...).
 */
export function paintBitArrayBars(
  ctx: CanvasRenderingContext2D,
  bits: BitSequence | readonly boolean[],
  pos: LabelPosition,
  moduleWidth: number,
  barHeight: number,
): void {
  ctx.fillStyle = "#000000";
  const len = bits.length;
  for (let i = 0; i < len; i++) {
    const on = (bits as BitSequence).at(i);
    if (!on) continue;
    ctx.fillRect(pos.x + i * moduleWidth, pos.y, moduleWidth, barHeight);
  }
}

/**
 * Walk a 2D bit matrix and paint cells. Accepts a single `moduleSize` (square
 * cells, used by QR/Aztec/DataMatrix) or a `(moduleW, moduleH)` pair (used by
 * PDF417, where each row is `rowHeight` tall but each column is 1 module wide).
 */
export function paintBitMatrixCells(
  ctx: CanvasRenderingContext2D,
  matrix: BitMatrix,
  pos: LabelPosition,
  moduleSize: number,
  moduleHeight: number = moduleSize,
): void {
  const moduleW = moduleSize;
  const moduleH = moduleHeight;
  ctx.fillStyle = "#000000";
  for (let r = 0; r < matrix.height; r++) {
    for (let c = 0; c < matrix.width; c++) {
      if (!matrix.at(c, r)) continue;
      ctx.fillRect(pos.x + c * moduleW, pos.y + r * moduleH, moduleW, moduleH);
    }
  }
}

/**
 * Render the barcode's human-readable line below (or above) the bars. Mirrors
 * `applyLineTextToCtx` in the Go drawer.
 */
export async function paintHumanReadableText(
  ctx: CanvasRenderingContext2D,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  barWidth: number,
  width: number,
  height: number,
): Promise<void> {
  await registerEmbeddedFonts();
  const fontSize = Math.max(barWidth, 1) * 10;
  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px "${FONT1_NAME}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  const x = pos.x + width / 2;
  const y = lineAbove ? pos.y - fontSize / 2 : pos.y + height + fontSize;
  ctx.fillText(text, x, y);
}

/**
 * EAN-13's specialized human-readable rendering. Mirrors `applyEan13TextToCtx`
 * in the Go drawer.
 *
 * EAN-13 has 95 modules: left guard (3) + left half 6 digits (42) + center
 * guard (5) + right half 6 digits (42) + right guard (3). The human-readable
 * line places the first digit to the LEFT of the bars, then 6 digits centered
 * under each half, with the guard bars hanging below them.
 */
export async function paintEan13Text(
  ctx: CanvasRenderingContext2D,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  width: number,
  height: number,
  barWidth: number,
  guardExtension: number,
): Promise<void> {
  await registerEmbeddedFonts();
  const fontSize = Math.round(width / 13);
  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px "${FONT0_NAME}"`;
  // Match Go's `gg.DrawString*` semantics, where the y argument is the top
  // of the text bounding box (anchor = 0). Canvas's default "alphabetic"
  // would treat y as the baseline and shove the digits up onto the bars.
  ctx.textBaseline = "top";

  if (text.length === 13 && !lineAbove) {
    // Mirrors Go's `applyEan13TextToCtx`: text top sits below the data-bar
    // baseline. With "top" baseline, fillText's `y` is the text top, so
    // pos.y + height puts it right at the data bars; subtracting
    // guardExtension and adding fontSize matches gg's anchored placement.
    const y = pos.y + height + fontSize - guardExtension;
    const first = text[0]!;
    const left = text.slice(1, 7);
    const right = text.slice(7, 13);

    ctx.textAlign = "center";
    ctx.fillText(first, pos.x - barWidth * 2, y);

    for (let k = 0; k < 6; k++) {
      const cx = pos.x + (3 + k * 7 + 3.5) * barWidth;
      ctx.fillText(left[k]!, cx, y);
    }
    for (let k = 0; k < 6; k++) {
      const cx = pos.x + (50 + k * 7 + 3.5) * barWidth;
      ctx.fillText(right[k]!, cx, y);
    }
  } else {
    ctx.textAlign = "center";
    const x = pos.x + width / 2;
    const y = pos.y - guardExtension / 2 - fontSize;
    ctx.fillText(text, x, y);
  }
}
