import type { ElementDrawer } from "./drawers/element_drawer.ts";
import type { LabelInfo } from "./elements/index.ts";

import { type DrawerOptions, withDefaults } from "./drawer-options.ts";
import { DrawerState } from "./drawers/drawer_state.ts";
import { defaultElementDrawers as defaultElementDrawersLazy } from "./drawers/index.ts";
import {
  colorWhite,
  encodeGrayscale,
  encodeMonochrome,
  reversePrint,
  zerofill,
} from "./images/index.ts";
import { platform } from "./platform.ts";

/**
 * Elements that may opt into reverse-print rendering implement this shape.
 * Mirrors the Go `reversePrintable` interface in `drawer.go`.
 */
interface ReversePrintable {
  isReversePrint(): boolean;
}

function isReversePrintable(element: unknown): element is ReversePrintable {
  return (
    typeof element === "object" &&
    element !== null &&
    "isReversePrint" in element &&
    typeof (element as { isReversePrint: unknown }).isReversePrint === "function"
  );
}

/** Fills the entire context with white. Mirrors `gCtx.SetColor(white); gCtx.Clear()`. */
function fillWhite(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = colorWhite;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Top-level renderer. Owns the registered per-element drawers and exposes
 * `drawLabelAsPng` to rasterise a parsed `LabelInfo` to a PNG buffer.
 *
 * Mirrors Go `zebrash.Drawer` / `NewDrawer` / `DrawLabelAsPng`.
 */
export class Drawer {
  private readonly elementDrawers: ElementDrawer[];

  constructor(elementDrawers?: ElementDrawer[]) {
    this.elementDrawers = elementDrawers ?? defaultElementDrawersLazy();
  }

  /**
   * Renders `label` to a PNG `Buffer` according to `options`.
   *
   * Behaviour parity with Go:
   *  - Apply `withDefaults` to the options.
   *  - Compute the image canvas as `min(labelWidth, label.printWidth)`.
   *  - Iterate elements; reverse-print elements draw onto a side buffer that
   *    is XOR-merged onto the main canvas after the element finishes.
   *  - If the print width is narrower than the label, or the label is
   *    inverted, redraw onto a label-wide canvas, optionally rotated 180°.
   *  - Encode as monochrome PNG by default, or 8-bit grayscale when requested.
   */
  async drawLabelAsPng(
    label: LabelInfo,
    options: Partial<DrawerOptions> = {},
  ): Promise<Uint8Array> {
    const opts = withDefaults(options);

    const state = new DrawerState();

    const labelWidth = Math.ceil(opts.labelWidthMm * opts.dpmm);
    const imageHeight = Math.ceil(opts.labelHeightMm * opts.dpmm);

    let imageWidth = labelWidth;
    if (label.printWidth > 0) {
      imageWidth = Math.min(labelWidth, label.printWidth);
    }

    const canvas = platform.createCanvas(imageWidth, imageHeight);
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("zebrash: failed to acquire 2D canvas context");
    fillWhite(ctx, imageWidth, imageHeight);

    let reverseCtx: CanvasRenderingContext2D | null = null;

    for (const element of label.elements) {
      const reverse = isReversePrintable(element) && element.isReversePrint();

      let targetCtx = ctx;
      if (reverse) {
        if (reverseCtx === null) {
          const rev = platform.createCanvas(imageWidth, imageHeight).getContext("2d");
          if (rev === null) throw new Error("zebrash: failed to acquire reverse-print 2D context");
          reverseCtx = rev;
        } else {
          zerofill(reverseCtx.canvas);
        }
        targetCtx = reverseCtx;
      }

      for (const drawer of this.elementDrawers) {
        await drawer.draw(targetCtx, element, opts, state);
      }

      if (reverse && reverseCtx !== null) {
        reversePrint(reverseCtx.canvas, ctx.canvas);
      }
    }

    // If print width was less than label width, or label was inverted,
    // composite onto a wider canvas, centring (and optionally flipping).
    const invertLabel = opts.enableInvertedLabels && label.inverted;
    let finalCtx = ctx;
    if (imageWidth !== labelWidth || invertLabel) {
      const wider = platform.createCanvas(labelWidth, imageHeight);
      const wCtx = wider.getContext("2d");
      if (wCtx === null) throw new Error("zebrash: failed to acquire 2D context for label canvas");
      fillWhite(wCtx, labelWidth, imageHeight);

      if (invertLabel) {
        wCtx.translate(labelWidth, imageHeight);
        wCtx.scale(-1, -1);
      }

      wCtx.drawImage(
        canvas as unknown as CanvasImageSource,
        Math.floor((labelWidth - imageWidth) / 2),
        0,
      );
      finalCtx = wCtx;
    }

    return opts.grayscaleOutput
      ? encodeGrayscale(finalCtx.canvas)
      : encodeMonochrome(finalCtx.canvas);
  }
}
