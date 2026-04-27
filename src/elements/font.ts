import type { FieldOrientation } from "./field_orientation.ts";

// Placeholder for parsed TTF font data; unit 5 (fonts) will refine.
export interface ParsedFont {
  name: string;
  data: Uint8Array;
}

export interface FontInfo {
  name: string;
  width: number;
  height: number;
  orientation: FieldOrientation;
  customFont?: ParsedFont | undefined;
  /** Optional canvas font-family alias when the font is a downloaded TTF (`~DU`). */
  customFontFamily?: string | undefined;
}

export function getFontSize(font: FontInfo): number {
  return font.height;
}

/** Factory mirroring Go's `elements.FontInfo{}` literals. */
export function newFontInfo(
  init: Partial<FontInfo> & { name: string } = { name: "A" },
): FontInfo {
  return {
    name: init.name,
    width: init.width ?? 0,
    height: init.height ?? 0,
    orientation: init.orientation ?? 0,
    customFont: init.customFont,
  };
}

export function getFontScaleX(font: FontInfo): number {
  if (font.height !== 0) {
    return (getWidthToHeightRatio(font) * font.width) / font.height;
  }
  return 1.0;
}

const bitmapFontSizes: Record<string, [number, number]> = {
  A: [9, 5],
  B: [11, 7],
  C: [18, 10],
  D: [18, 10],
  E: [28, 15],
  F: [26, 13],
  G: [60, 40],
  H: [21, 13],
  GS: [24, 24],
};

export function fontExists(font: FontInfo): boolean {
  return isStandardFont(font) || isCustomFont(font);
}

export function isCustomFont(font: FontInfo): boolean {
  return font.customFont != null;
}

export function isStandardFont(font: FontInfo): boolean {
  return font.name === "0" || Object.hasOwn(bitmapFontSizes, font.name);
}

// Bitmap fonts (everything other than font 0) cannot be freely scaled.
// Their size should always divide by their base size without remainder so
// we need to adjust them.
//
// NOTE: in order to emulate Zebra fonts 0, A-H we use only 2 different TTF
// fonts so don't confuse Zebra and our fonts, they are not the same thing.
export function fontWithAdjustedSizes(font: FontInfo): FontInfo {
  const orgSize = bitmapFontSizes[font.name];
  const isCustom = isCustomFont(font);

  // Scalable font.
  // Just set width and height to the same value if one of them is zero.
  if (isCustom || orgSize === undefined) {
    let width = font.width;
    let height = font.height;

    if (width === 0) {
      width = height;
    }
    if (height === 0) {
      height = width;
    }

    // Seems like font 0 can't be smaller than 10 in width or height.
    width = Math.max(width, 10);
    height = Math.max(height, 10);

    return { ...font, width: width, height: height };
  }

  let width = font.width;
  let height = font.height;

  if (width === 0 && height === 0) {
    return { ...font, width: orgSize[1], height: orgSize[0] };
  }

  if (width === 0) {
    width = orgSize[1] * Math.max(Math.round(height / orgSize[0]), 1);
  } else {
    width = orgSize[1] * Math.max(Math.round(width / orgSize[1]), 1);
  }

  if (height === 0) {
    height = orgSize[0] * Math.max(Math.round(width / orgSize[1]), 1);
  } else {
    height = orgSize[0] * Math.max(Math.round(height / orgSize[0]), 1);
  }

  return { ...font, width: width, height: height };
}

function getWidthToHeightRatio(font: FontInfo): number {
  if (font.name === "0" || font.name === "GS" || isCustomFont(font)) {
    return 1.0;
  }

  // TODO: figure out why we need this at all, might be something to do with TTF fonts we use.
  return 2.0;
}
