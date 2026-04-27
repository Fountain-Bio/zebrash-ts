// Port of zebrash/internal/barcodes/code128/code128.go
// In Go this wraps a []bool bit pattern with image.Image methods so the
// renderer can read pixels. In TS we keep a lightweight bit container; the
// drawer (unit 20) is responsible for turning it into pixels.

/**
 * A 1-D bit pattern produced by the Code 128 encoder. Mirrors Go's
 * internal `code128` struct.
 */
export class Code128 {
  readonly code: ReadonlyArray<boolean>;
  readonly width: number;
  readonly height: number;
  readonly barWidth: number;

  constructor(code: ReadonlyArray<boolean>, height: number, barWidth: number) {
    const bw = Math.max(1, barWidth);
    const h = Math.max(1, height);
    this.code = code;
    this.barWidth = bw;
    this.height = h;
    this.width = code.length * bw;
  }

  /** Whether a column maps to a black bar. Matches Go's `At(x, y)`. */
  isBlackAt(x: number): boolean {
    const idx = Math.floor(x / this.barWidth);
    return idx >= 0 && idx < this.code.length && this.code[idx] === true;
  }
}

/**
 * Build a Code128 image wrapper from a bit list. Mirrors Go's `newCode128`.
 */
export function newCode128(
  code: ReadonlyArray<boolean>,
  height: number,
  barWidth: number,
): Code128 {
  return new Code128(code, height, barWidth);
}
