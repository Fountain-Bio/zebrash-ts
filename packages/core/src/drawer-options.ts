/**
 * How `<text>` elements declare their font in `drawLabelAsSvg` output. Ignored
 * by `drawLabelAsPng` which always uses platform-registered fonts.
 *
 * - `"url"` (default): emit `@font-face src: url("<cdn>/font.ttf")` so the
 *   browser can fetch the same TTFs the runtime font loader uses. Smallest
 *   SVGs; requires CDN access at view time.
 * - `"embed"`: base64-inline the TTFs as `data:font/ttf;base64,…`. Fully
 *   self-contained; adds ~54KB (Helvetica only) to ~900KB (DejaVu pair) per
 *   SVG depending on which families the label references.
 * - `"none"`: emit `font-family` only, no `@font-face` block. Renders only
 *   where the host already has the font (system-installed or supplied to
 *   the rasteriser directly, as in the test harness).
 */
export type SvgFontEmbedMode = "url" | "embed" | "none";

/**
 * Public drawer options — mirrors Go `drawers.DrawerOptions`.
 *
 * Defaults mirror `WithDefaults()` and produce a 4x8 inch label at 203 dpi.
 */
export interface DrawerOptions {
  labelWidthMm: number;
  labelHeightMm: number;
  dpmm: number;
  /** Render labels with inverted orientation upside-down. */
  enableInvertedLabels: boolean;
  /** Output 8-bit grayscale PNG preserving anti-aliasing instead of binary monochrome. PNG-only. */
  grayscaleOutput: boolean;
  /** How fonts are referenced in SVG output. SVG-only. */
  fontEmbed: SvgFontEmbedMode;
}

/**
 * Returns a copy of `options` with defaults applied for any zero/missing fields.
 *
 * Defaults: 101.6 mm × 203.2 mm at 8 dpmm, monochrome, no inversion, SVG
 * fonts referenced by URL.
 */
export function withDefaults(options: Partial<DrawerOptions> = {}): DrawerOptions {
  return {
    labelWidthMm: options.labelWidthMm || 101.6,
    labelHeightMm: options.labelHeightMm || 203.2,
    dpmm: options.dpmm || 8,
    enableInvertedLabels: options.enableInvertedLabels ?? false,
    grayscaleOutput: options.grayscaleOutput ?? false,
    fontEmbed: options.fontEmbed ?? "url",
  };
}
