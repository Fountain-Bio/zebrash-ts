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
import { type SvgElementDrawer, defaultSvgElementDrawers } from "./svg-drawers/index.ts";
import { SvgEmitter } from "./svg/emitter.ts";
import { buildFontFaceCss } from "./svg/font_embed.ts";

/**
 * Element shape carrying the `^FR` reverse-print flag. Mirrors Go's
 * `reversePrintable` interface in `drawer.go`, but adapted to this port's
 * data model where `reversePrint` is a `{ value: boolean }` property rather
 * than a method.
 */
interface ReversePrintable {
  reversePrint: { value: boolean };
}

function isReversePrintable(element: unknown): element is ReversePrintable {
  if (typeof element !== "object" || element === null) return false;
  const rp = (element as { reversePrint?: unknown }).reversePrint;
  return (
    typeof rp === "object" && rp !== null && typeof (rp as { value?: unknown }).value === "boolean"
  );
}

function isReversePrintActive(element: ReversePrintable): boolean {
  return element.reversePrint.value === true;
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
  private svgElementDrawers: SvgElementDrawer[] | null = null;

  constructor(elementDrawers?: ElementDrawer[]) {
    this.elementDrawers = elementDrawers ?? defaultElementDrawersLazy();
  }

  /** Lazy SVG drawer set — only constructed when `drawLabelAsSvg` is called. */
  private getSvgElementDrawers(): SvgElementDrawer[] {
    if (this.svgElementDrawers === null) {
      this.svgElementDrawers = defaultSvgElementDrawers();
    }
    return this.svgElementDrawers;
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
      const reverse = isReversePrintable(element) && isReversePrintActive(element);

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

      // @napi-rs/canvas's putImageData is affected by the active transform
      // (spec violation — putImageData should write at raw pixel coords).
      // encodeMonochrome / encodeGrayscale call putImageData below, so reset
      // to identity here. No-op in browsers, which already follow the spec.
      wCtx.setTransform(1, 0, 0, 1, 0, 0);

      finalCtx = wCtx;
    }

    return opts.grayscaleOutput
      ? encodeGrayscale(finalCtx.canvas)
      : encodeMonochrome(finalCtx.canvas);
  }

  /**
   * Renders `label` to an SVG document string according to `options`.
   *
   * Behaviour parity with `drawLabelAsPng` for everything geometric:
   *  - Apply `withDefaults` to the options.
   *  - Compute `imageWidth = min(labelWidth, label.printWidth)`.
   *  - Reverse-print elements are wrapped in a
   *    `<g style="mix-blend-mode: difference">` group, which is
   *    mathematically equivalent to the XOR composite the PNG path uses
   *    when the canvas only holds black-on-white (the monochrome case).
   *  - If the print width is narrower than the label, or the label is
   *    inverted, content is centred and optionally rotated 180° via outer
   *    `<g transform>` wrappers — same arithmetic as the canvas pipeline.
   *
   * SVG-specific behaviour (controlled by `options.fontEmbed`):
   *  - `"url"` (default): emits one `@font-face url(...)` per used font,
   *    pointing at the same CDN base the runtime font loader uses.
   *  - `"embed"`: base64-inlines the TTF bytes (large, fully self-contained).
   *  - `"none"`: omits `@font-face` entirely (caller supplies fonts to the
   *    rasteriser, or the host has them installed).
   *
   * `grayscaleOutput` is ignored (PNG-only encoding concern).
   */
  async drawLabelAsSvg(label: LabelInfo, options: Partial<DrawerOptions> = {}): Promise<string> {
    const opts = withDefaults(options);

    const state = new DrawerState();

    const labelWidth = Math.ceil(opts.labelWidthMm * opts.dpmm);
    const imageHeight = Math.ceil(opts.labelHeightMm * opts.dpmm);

    let imageWidth = labelWidth;
    if (label.printWidth > 0) {
      imageWidth = Math.min(labelWidth, label.printWidth);
    }

    const emitter = new SvgEmitter();

    // White background. SVG needs an explicit rect — `<svg>` itself is
    // transparent.
    emitter.rect(0, 0, labelWidth, imageHeight, colorWhite);

    // Mirror the PNG path's outer composition: if `imageWidth < labelWidth`
    // or the label is inverted, wrap content in groups that translate /
    // rotate the inner drawing into place.
    const invertLabel = opts.enableInvertedLabels && label.inverted;

    emitter.save();
    if (invertLabel) {
      // Rotate 180° about the canvas centre — equivalent to the canvas
      // pipeline's `translate(W,H); scale(-1,-1)`.
      emitter.translate(labelWidth, imageHeight);
      emitter.scale(-1, -1);
    }
    if (imageWidth !== labelWidth) {
      emitter.translate(Math.floor((labelWidth - imageWidth) / 2), 0);
    }

    const svgDrawers = this.getSvgElementDrawers();

    let reverseFilterDefined = false;

    for (const element of label.elements) {
      const reverse = isReversePrintable(element) && isReversePrintActive(element);

      if (reverse) {
        if (!reverseFilterDefined) {
          // The canvas reverse-print operation is `dst = 255 - dst` wherever
          // the element drew (regardless of the colour the element drew in).
          // To replicate this with SVG blend modes, we map the element's
          // drawn pixels to white via `feFlood` masked by `SourceAlpha`, then
          // composite the result with `mix-blend-mode: difference`:
          //   white over black dst → |255 − 0|   = 255 (white)
          //   white over white dst → |255 − 255| =   0 (black)
          // i.e. inversion of dst wherever the element drew. The element
          // drawers continue to use black ink — the filter handles the
          // colour swap so no per-drawer change is required.
          emitter.defineFragment(
            "zb-reverse",
            '<filter id="zb-reverse" x="0%" y="0%" width="100%" height="100%">' +
              '<feFlood flood-color="#ffffff" result="flood"/>' +
              '<feComposite in="flood" in2="SourceAlpha" operator="in"/>' +
              "</filter>",
          );
          reverseFilterDefined = true;
        }
        emitter.pushGroup(
          'filter="url(#zb-reverse)" style="mix-blend-mode:difference;isolation:auto"',
        );
      }

      for (const drawer of svgDrawers) {
        await drawer.draw(emitter, element, opts, state);
      }

      if (reverse) {
        emitter.popGroup();
      }
    }

    emitter.restore();

    const fontFaceCss = await buildFontFaceCss(emitter.usedFonts, opts.fontEmbed);
    return emitter.toSvg(labelWidth, imageHeight, fontFaceCss);
  }
}
