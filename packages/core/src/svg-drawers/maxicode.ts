// SVG analogue of `drawers/maxicode.ts`.
//
// Modules are emitted as `<use href="#hex">` references against a single
// `<symbol>` defined in `<defs>`, instead of a `<polygon>` per cell —
// MaxiCode has 884 modules, so this saves ~80% of the output size.

import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import {
  MAXICODE_COLS,
  MAXICODE_ROWS,
  type MaxicodeGrid,
  encodeMaxicode,
} from "../barcodes/maxicode/index.ts";
import { adjustImageTypeSetPosition } from "../drawers/element_drawer.ts";
import {
  FieldOrientationNormal,
  type MaxicodeWithData,
  getMaxicodeInputData,
} from "../elements/index.ts";

const BLACK = "#000000";
const HEX_SYMBOL_ID = "zb-mxc-hex";

export function newMaxicodeSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown, options): void {
      const barcode = element as MaxicodeWithData | null;
      if (!barcode || barcode._kind !== "MaxicodeWithData") return;

      const inputData = getMaxicodeInputData(barcode);
      const grid = encodeMaxicode(barcode.code.mode, 0, inputData);

      const dpmm = options.dpmm;
      const hexRectW = Math.round(0.76 * dpmm);
      const hexRectH = Math.round(0.88 * dpmm);

      const imageWidth = Math.trunc(28 * dpmm);
      const imageHeight = Math.trunc(26.8 * dpmm);

      const pos = adjustImageTypeSetPosition(
        imageWidth,
        imageHeight,
        barcode.position,
        FieldOrientationNormal,
      );

      // Define the hex `<symbol>` once — reused across every cell. Symbol
      // dimensions match the canvas drawer's per-cell hexagon path.
      const hexW = 0.76 * dpmm;
      const hexH = 0.88 * dpmm;
      emitter.defineSymbol(
        HEX_SYMBOL_ID,
        `<polygon points="${formatHexPoints(hexW, hexH)}" fill="${BLACK}"/>`,
      );

      emitter.save();
      try {
        emitter.translate(pos.x - hexRectW, pos.y - hexRectH);
        drawMaxicodeGridSvg(emitter, grid, dpmm);
      } finally {
        emitter.restore();
      }
    },
  };
}

function formatHexPoints(w: number, h: number): string {
  return [
    [w * 0.5, 0],
    [w, h * 0.25],
    [w, h * 0.75],
    [w * 0.5, h],
    [0, h * 0.75],
    [0, h * 0.25],
  ]
    .map(([x, y]) => `${roundShort(x!)},${roundShort(y!)}`)
    .join(" ");
}

function roundShort(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  return v
    .toFixed(3)
    .replace(/(\.\d*?)0+$/, "$1")
    .replace(/\.$/, "");
}

/**
 * Render a Maxicode grid: bullseye rings (three stroked circles) + a
 * hexagonal module per dark cell. Mirrors `drawMaxicodeGrid` on the canvas
 * side.
 */
function drawMaxicodeGridSvg(emitter: SvgEmitter, grid: MaxicodeGrid, dpmm: number): void {
  const centerX = 13.64 * dpmm;
  const centerY = 13.43 * dpmm;
  const innerRadius = 0.85 * dpmm;
  const centerRadius = 2.2 * dpmm;
  const outerRadius = 3.54 * dpmm;
  const ringStroke = 0.67 * dpmm;

  for (const radius of [outerRadius, centerRadius, innerRadius]) {
    emitter.circleStroke(centerX, centerY, radius, BLACK, ringStroke);
  }

  for (let row = 0; row < MAXICODE_ROWS; row++) {
    const rowOffset = (row & 1) === 1 ? 1.32 : 0.88;
    for (let col = 0; col < MAXICODE_COLS; col++) {
      if (!grid.get(row, col)) continue;
      const hexRectX = (col * 0.88 + rowOffset) * dpmm;
      const hexRectY = (row * 0.76 + 0.76) * dpmm;
      emitter.use(HEX_SYMBOL_ID, hexRectX, hexRectY);
    }
  }
}
