// Shared painting helpers for the unit-23 barcode drawers.

import type { SKRSContext2D } from "@napi-rs/canvas";
import { FONT0_NAME, FONT1_NAME, registerEmbeddedFonts } from "../assets/index.js";
import type { BitMatrix } from "../barcodes/utils/index.js";
import type { LabelPosition } from "../elements/index.js";

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
  ctx: SKRSContext2D,
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
 * Walk a 2D bit matrix and paint `moduleSize × moduleSize` cells where the bit
 * is on. Used for QR / Aztec / DataMatrix / PDF417.
 */
export function paintBitMatrixCells(
  ctx: SKRSContext2D,
  matrix: BitMatrix,
  pos: LabelPosition,
  moduleSize: number,
): void {
  ctx.fillStyle = "#000000";
  for (let r = 0; r < matrix.height; r++) {
    for (let c = 0; c < matrix.width; c++) {
      if (!matrix.at(c, r)) continue;
      ctx.fillRect(pos.x + c * moduleSize, pos.y + r * moduleSize, moduleSize, moduleSize);
    }
  }
}

/**
 * Render the barcode's human-readable line below (or above) the bars. Mirrors
 * `applyLineTextToCtx` in the Go drawer.
 */
export function paintHumanReadableText(
  ctx: SKRSContext2D,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  barWidth: number,
  width: number,
  height: number,
): void {
  registerEmbeddedFonts();
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
 * in the Go drawer with simpler text justification — full justified rendering
 * (drawStringJustified) lands with unit 22.
 */
export function paintEan13Text(
  ctx: SKRSContext2D,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  width: number,
  height: number,
  barWidth: number,
  guardExtension: number,
): void {
  registerEmbeddedFonts();
  const fontSize = Math.round(width / 13);
  ctx.fillStyle = "#000000";
  ctx.font = `${fontSize}px "${FONT0_NAME}"`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  if (text.length === 13 && !lineAbove) {
    const formatted = `${text[0]}  ${text.slice(1, 7)}  ${text.slice(7, 13)}`;
    const x = pos.x - barWidth * 10;
    const y = pos.y + height + fontSize - guardExtension;
    ctx.fillText(formatted, x, y);
  } else {
    const x = pos.x + barWidth * 8;
    const y = pos.y - guardExtension / 2;
    ctx.fillText(text, x, y);
  }
}
