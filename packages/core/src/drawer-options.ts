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
  /** Output 8-bit grayscale PNG preserving anti-aliasing instead of binary monochrome. */
  grayscaleOutput: boolean;
}

/**
 * Returns a copy of `options` with defaults applied for any zero/missing fields.
 *
 * Defaults: 101.6 mm × 203.2 mm at 8 dpmm, monochrome, no inversion.
 */
export function withDefaults(options: Partial<DrawerOptions> = {}): DrawerOptions {
  return {
    labelWidthMm: options.labelWidthMm || 101.6,
    labelHeightMm: options.labelHeightMm || 203.2,
    dpmm: options.dpmm || 8,
    enableInvertedLabels: options.enableInvertedLabels ?? false,
    grayscaleOutput: options.grayscaleOutput ?? false,
  };
}
