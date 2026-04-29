// SVG analogues of the canvas helpers in `drawers/barcode_paint.ts`.
//
// Two notable differences from the canvas versions:
//   1. Adjacent dark cells in a row collapse into a single wider `<rect>`.
//      A QR code with several thousand modules would otherwise emit one
//      element per dark cell — runs are typically 10×–100× more compact.
//   2. Text uses the SVG `<text>` element with a tracked `FontKey` so the
//      drawer can emit a matching `@font-face` rule once.

import type { BitMatrix } from "../barcodes/utils/index.ts";
import type { LabelPosition } from "../elements/index.ts";
import type { SvgEmitter } from "../svg/emitter.ts";

import { EmbeddedFontFamilies, FONT0_NAME, FONT1_NAME } from "../assets/index.ts";

const BLACK = "#000000";

// Map canvas family-name aliases → FontKey for SvgEmitter font-tracking.
const FONT_KEY_FOR_FAMILY = new Map<string, "HelveticaBold" | "DejavuSansMono">([
  [EmbeddedFontFamilies.HelveticaBold, "HelveticaBold"],
  [EmbeddedFontFamilies.DejavuSansMono, "DejavuSansMono"],
]);

/** Minimal shape for any 1D bit sequence painter input — same as canvas helper. */
export interface BitSequence {
  readonly length: number;
  at(i: number): boolean | undefined;
}

/**
 * Walk a 1D bit pattern and emit vertical bars `moduleWidth` wide and
 * `barHeight` tall, starting at `pos`. Adjacent dark modules merge into a
 * single wider `<rect>`.
 */
export function paintBitArrayBarsSvg(
  emitter: SvgEmitter,
  bits: BitSequence | readonly boolean[],
  pos: LabelPosition,
  moduleWidth: number,
  barHeight: number,
): void {
  const seq = bits as BitSequence;
  const len = seq.length;
  let runStart = -1;

  for (let i = 0; i < len; i++) {
    const on = seq.at(i) === true;
    if (on && runStart < 0) {
      runStart = i;
    } else if (!on && runStart >= 0) {
      emitter.rect(
        pos.x + runStart * moduleWidth,
        pos.y,
        (i - runStart) * moduleWidth,
        barHeight,
        BLACK,
      );
      runStart = -1;
    }
  }
  if (runStart >= 0) {
    emitter.rect(
      pos.x + runStart * moduleWidth,
      pos.y,
      (len - runStart) * moduleWidth,
      barHeight,
      BLACK,
    );
  }
}

/**
 * Walk a 2D bit matrix and emit cells. `moduleSize` is the cell width;
 * `moduleHeight` defaults to a square cell (used by QR/Aztec/DataMatrix)
 * but can be passed separately for PDF417 where rows are taller than they
 * are wide. Horizontally adjacent dark cells in a row collapse into one
 * `<rect>`.
 */
export function paintBitMatrixCellsSvg(
  emitter: SvgEmitter,
  matrix: BitMatrix,
  pos: LabelPosition,
  moduleSize: number,
  moduleHeight: number = moduleSize,
): void {
  const moduleW = moduleSize;
  const moduleH = moduleHeight;

  for (let r = 0; r < matrix.height; r++) {
    let runStart = -1;
    for (let c = 0; c < matrix.width; c++) {
      const on = matrix.at(c, r);
      if (on && runStart < 0) {
        runStart = c;
      } else if (!on && runStart >= 0) {
        emitter.rect(
          pos.x + runStart * moduleW,
          pos.y + r * moduleH,
          (c - runStart) * moduleW,
          moduleH,
          BLACK,
        );
        runStart = -1;
      }
    }
    if (runStart >= 0) {
      emitter.rect(
        pos.x + runStart * moduleW,
        pos.y + r * moduleH,
        (matrix.width - runStart) * moduleW,
        moduleH,
        BLACK,
      );
    }
  }
}

/**
 * Render the barcode's human-readable line below (or above) the bars.
 * Mirrors `paintHumanReadableText` on the canvas side.
 */
export function paintHumanReadableTextSvg(
  emitter: SvgEmitter,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  barWidth: number,
  width: number,
  height: number,
): void {
  const fontSize = Math.max(barWidth, 1) * 10;
  const x = pos.x + width / 2;
  const y = lineAbove ? pos.y - fontSize / 2 : pos.y + height + fontSize;
  emitter.text(x, y, text, {
    fontFamily: FONT1_NAME,
    fontKey: FONT_KEY_FOR_FAMILY.get(FONT1_NAME),
    fontSize,
    anchor: "middle",
    fill: BLACK,
  });
}

/**
 * EAN-13's specialised human-readable rendering. Mirrors `paintEan13Text`
 * on the canvas side, including the layout where the first digit sits to
 * the LEFT of the bars and the remaining 12 are split into two groups of
 * six centred under each half of the bars.
 */
export function paintEan13TextSvg(
  emitter: SvgEmitter,
  text: string,
  pos: LabelPosition,
  lineAbove: boolean,
  width: number,
  height: number,
  barWidth: number,
  guardExtension: number,
): void {
  const fontSize = Math.round(width / 13);
  const family = FONT0_NAME;
  const fontKey = FONT_KEY_FOR_FAMILY.get(FONT0_NAME);

  if (text.length === 13 && !lineAbove) {
    // Mirrors the canvas drawer's anchor placement: text top sits below the
    // data-bar baseline; SVG `dominant-baseline: text-top` gives us the
    // same anchor as canvas's `textBaseline = "top"`.
    const y = pos.y + height + fontSize - guardExtension;
    const first = text[0]!;
    const left = text.slice(1, 7);
    const right = text.slice(7, 13);

    emitter.text(pos.x - barWidth * 2, y, first, {
      fontFamily: family,
      fontKey,
      fontSize,
      anchor: "middle",
      baseline: "text-top",
      fill: BLACK,
    });
    for (let k = 0; k < 6; k++) {
      const cx = pos.x + (3 + k * 7 + 3.5) * barWidth;
      emitter.text(cx, y, left[k]!, {
        fontFamily: family,
        fontKey,
        fontSize,
        anchor: "middle",
        baseline: "text-top",
        fill: BLACK,
      });
    }
    for (let k = 0; k < 6; k++) {
      const cx = pos.x + (50 + k * 7 + 3.5) * barWidth;
      emitter.text(cx, y, right[k]!, {
        fontFamily: family,
        fontKey,
        fontSize,
        anchor: "middle",
        baseline: "text-top",
        fill: BLACK,
      });
    }
  } else {
    const x = pos.x + width / 2;
    const y = pos.y - guardExtension / 2 - fontSize;
    emitter.text(x, y, text, {
      fontFamily: family,
      fontKey,
      fontSize,
      anchor: "middle",
      baseline: "text-top",
      fill: BLACK,
    });
  }
}
