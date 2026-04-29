// SVG analogue of `drawers/graphic_box.ts` (and Go's
// `internal/drawers/graphic_box.go`).

import type { GraphicBox } from "../elements/graphic_box.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { LineColor } from "../elements/line_color.ts";

const COLOR_BLACK = "#000000";
const COLOR_WHITE = "#ffffff";

function isGraphicBox(value: unknown): value is GraphicBox {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "GraphicBox"
  );
}

function colorOf(line: LineColor): string {
  return line === LineColor.White ? COLOR_WHITE : COLOR_BLACK;
}

export function newGraphicBoxSvgDrawer(): SvgElementDrawer {
  return {
    draw(emitter: SvgEmitter, element: unknown): void {
      if (!isGraphicBox(element)) return;

      let width = element.width;
      let height = element.height;
      const border = element.borderThickness;

      if (border > width) width = border;
      if (border > height) height = border;

      const offset = border / 2;
      const x = element.position.x + offset;
      const y = element.position.y + offset;
      let w = width - border;
      let h = height - border;

      if (w === 0 && h === 0) {
        w = 1;
        h = 1;
      }

      const color = colorOf(element.lineColor);

      // Degenerate rectangles (one dimension reduces to zero after
      // subtracting the border) are how ZPL labels build thin bars: e.g.
      // `^GB184,,8,B` is a width=184 box with default height=0 and
      // border=8, which the canvas drawer paints as a fat horizontal
      // stroke. SVG explicitly skips rendering of `<rect width=0>` and
      // `<rect height=0>` per spec, so we emit a filled `<rect>` with the
      // visible footprint instead.
      if (w === 0 || h === 0) {
        emitter.rect(element.position.x, element.position.y, width, height, color);
        return;
      }

      if (element.cornerRounding > 0) {
        // Rounded box rendered as outer-minus-inner donut. Mirrors the
        // canvas drawer's "fill outer, then destination-out inner" pattern,
        // but expressed declaratively as a single path with even-odd fill.
        const r1 = (element.cornerRounding * Math.min(width, height)) / 16;
        const innerW = width - 2 * border;
        const innerH = height - 2 * border;
        const r2 =
          innerW > 0 && innerH > 0 ? (element.cornerRounding * Math.min(innerW, innerH)) / 16 : 0;
        emitter.roundedDonut(
          element.position.x,
          element.position.y,
          width,
          height,
          r1,
          element.position.x + border,
          element.position.y + border,
          innerW,
          innerH,
          r2,
          color,
        );
        return;
      }

      // Unrounded: stroked rectangle outline. Border is centred on the path
      // (matching the canvas drawer's offset-by-border/2 pattern).
      emitter.rectStroke(x, y, w, h, color, border);
    },
  };
}
