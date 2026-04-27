import type { BitList } from "../utils/index.ts";

/**
 * Pixel value returned by `Ean13.at`. The Go version returns
 * `images.ColorBlack` or `images.ColorTransparent`; we mirror that with a
 * simple enum of pixel states.
 */
export type Ean13Pixel = "black" | "transparent";

export interface Ean13Bounds {
  /** Inclusive minimum X. */
  minX: number;
  /** Inclusive minimum Y. */
  minY: number;
  /** Exclusive maximum X (== width). */
  maxX: number;
  /** Exclusive maximum Y (== height + guardExtension). */
  maxY: number;
}

/**
 * Ean13 mirrors the Go `ean13` struct + `image.Image` methods.
 * The drawer (unit not yet ported) will sample pixels via `at(x, y)`.
 */
export class Ean13 {
  readonly code: BitList;
  readonly width: number;
  readonly height: number;
  readonly barWidth: number;
  readonly guardExtension: number;

  constructor(code: BitList, height: number, barWidth: number) {
    const bw = Math.max(1, barWidth);
    const h = Math.max(1, height);
    this.code = code;
    this.barWidth = bw;
    this.height = h;
    this.width = code.len() * bw;
    this.guardExtension = calculateGuardExtension(bw);
  }

  bounds(): Ean13Bounds {
    return { minX: 0, minY: 0, maxX: this.width, maxY: this.height + this.guardExtension };
  }

  /** Returns the pixel value at `(x, y)`. Mirrors `image.Image.At`. */
  at(x: number, y: number): Ean13Pixel {
    const moduleX = Math.floor(x / this.barWidth);

    if (moduleX < 0 || moduleX >= this.code.len()) {
      return "transparent";
    }
    if (!this.code.getBit(moduleX)) {
      return "transparent";
    }
    if (isGuardBar(moduleX)) {
      // Guard bars extend the full height.
      return "black";
    }
    // Regular bars only draw in the upper portion (leaving room for guard
    // extension at bottom).
    if (y < this.height) {
      return "black";
    }
    return "transparent";
  }
}

/** Constructor mirroring `newEan13` in ean13.go. */
export function newEan13(code: BitList, height: number, barWidth: number): Ean13 {
  return new Ean13(code, height, barWidth);
}

/**
 * isGuardBar checks if a module position is part of a guard pattern.
 * EAN-13 structure (95 modules total):
 *  - Start guard: modules 0-2 (3 modules)
 *  - Left digits: modules 3-44 (42 modules = 6 digits * 7)
 *  - Middle guard: modules 45-49 (5 modules)
 *  - Right digits: modules 50-91 (42 modules = 6 digits * 7)
 *  - End guard: modules 92-94 (3 modules)
 */
export function isGuardBar(x: number): boolean {
  if (x >= 0 && x <= 2) return true;
  if (x >= 45 && x <= 49) return true;
  if (x >= 92 && x <= 94) return true;
  return false;
}

export function calculateGuardExtension(barWidth: number): number {
  return Math.min(barWidth * 5, 20);
}
