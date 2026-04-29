// SVG analogue of `drawers/barcode_ean13.ts`.

import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import {
  calculateEan13GuardExtension,
  encodeEan13,
  isGuardBar,
  sanitizeContent,
} from "../barcodes/ean13/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import {
  type BarcodeEan13WithData,
  type FieldOrientation,
  FieldOrientation90,
  FieldOrientation180,
  type LabelPosition,
} from "../elements/index.ts";
import { paintEan13TextSvg } from "./barcode_paint_svg.ts";
import { rotateForOrientation } from "./transform.ts";

const BLACK = "#000000";

export function newBarcodeEan13SvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      const barcode = element as BarcodeEan13WithData | null;
      if (!barcode || barcode._kind !== "BarcodeEan13WithData") return;

      const moduleWidth = Math.max(barcode.width, 1);
      const moduleHeight = Math.max(barcode.height, 1);

      const text = sanitizeContent(barcode.data);
      const bits = encodeEan13(text);
      if (bits === null) return;
      const width = bits.length * moduleWidth;
      const height = moduleHeight;
      const guardExtension = calculateEan13GuardExtension(moduleWidth);

      let pos = adjustImageTypeSetPosition(width, height, barcode.position, barcode.orientation);
      pos = adjustEan13Position(pos, barcode.orientation, guardExtension);

      emitter.save();
      try {
        rotateForOrientation(emitter, width, height, pos, barcode.orientation);
        paintEan13BarsSvg(emitter, bits, pos, moduleWidth, height, guardExtension);
        if (barcode.line) {
          paintEan13TextSvg(
            emitter,
            text,
            pos,
            barcode.lineAbove,
            width,
            height,
            moduleWidth,
            guardExtension,
          );
        }
      } finally {
        emitter.restore();
      }
    },
  };
}

/**
 * EAN-13 bar painting: guard bars (start, middle, end groups) extend the
 * full `barHeight + guardExtension`; data bars stop at `barHeight` so the
 * digits sit in the remaining white space.
 *
 * Two-height variant precludes the run-collapse trick used elsewhere —
 * adjacent bars may differ in height, so we emit them per-module.
 */
function paintEan13BarsSvg(
  emitter: SvgEmitter,
  bits: { length: number; at(i: number): boolean | undefined },
  pos: LabelPosition,
  moduleWidth: number,
  barHeight: number,
  guardExtension: number,
): void {
  const len = bits.length;
  for (let i = 0; i < len; i++) {
    if (!bits.at(i)) continue;
    const x = pos.x + i * moduleWidth;
    const h = isGuardBar(i) ? barHeight + guardExtension : barHeight;
    emitter.rect(x, pos.y, moduleWidth, h, BLACK);
  }
}

function adjustEan13Position(
  pos: LabelPosition,
  ori: FieldOrientation,
  guardExtension: number,
): LabelPosition {
  if (pos.calculateFromBottom) return pos;

  let { x, y } = pos;
  switch (ori) {
    case FieldOrientation90:
      x -= guardExtension;
      break;
    case FieldOrientation180:
      y -= guardExtension;
      break;
  }
  return {
    x,
    y,
    calculateFromBottom: pos.calculateFromBottom,
    automaticPosition: pos.automaticPosition,
  };
}
