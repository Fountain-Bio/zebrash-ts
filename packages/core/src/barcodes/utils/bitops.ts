// Internal 32-bit unsigned bit-twiddling helpers shared by BitArray and BitMatrix.
//
// JavaScript bitwise operators treat their operands as 32-bit signed integers, so we
// coerce results back to unsigned with `>>> 0` where Go's uint32 semantics matter.

// Counts trailing zero bits in a 32-bit unsigned integer (Go's bits.TrailingZeros32).
export function trailingZeros32(x: number): number {
  if (x === 0) return 32;
  let n = 0;
  let v = x >>> 0;
  if ((v & 0x0000ffff) === 0) {
    n += 16;
    v >>>= 16;
  }
  if ((v & 0x000000ff) === 0) {
    n += 8;
    v >>>= 8;
  }
  if ((v & 0x0000000f) === 0) {
    n += 4;
    v >>>= 4;
  }
  if ((v & 0x00000003) === 0) {
    n += 2;
    v >>>= 2;
  }
  if ((v & 0x00000001) === 0) {
    n += 1;
  }
  return n;
}

// Reverses the bits of a 32-bit unsigned integer (Go's bits.Reverse32).
export function reverse32(x: number): number {
  let v = x >>> 0;
  v = (((v & 0xaaaaaaaa) >>> 1) | ((v & 0x55555555) << 1)) >>> 0;
  v = (((v & 0xcccccccc) >>> 2) | ((v & 0x33333333) << 2)) >>> 0;
  v = (((v & 0xf0f0f0f0) >>> 4) | ((v & 0x0f0f0f0f) << 4)) >>> 0;
  v = (((v & 0xff00ff00) >>> 8) | ((v & 0x00ff00ff) << 8)) >>> 0;
  v = ((v >>> 16) | (v << 16)) >>> 0;
  return v;
}
