import { BitList } from "../utils/index.js";

/**
 * Square Aztec matrix backed by a BitList. `set(x, y)` stores the dark module
 * at `(x*size + y)`. The Go version implements `image.Image`; in TS we expose
 * the matrix as a square pixel grid and let the drawer layer convert it to an
 * actual image.
 */
export class AztecCode {
  readonly size: number;
  readonly bits: BitList;
  content: Uint8Array | null = null;

  constructor(size: number) {
    this.size = size;
    // Backing store is sized up front; setBit/getBit operate by index, so we
    // don't need to push N bits before reading them.
    this.bits = new BitList(size * size);
  }

  set(x: number, y: number): void {
    this.bits.setBit(x * this.size + y, true);
  }

  /** Returns true when the module at (x, y) is dark. */
  getModule(x: number, y: number): boolean {
    return this.bits.getBit(x * this.size + y);
  }

  /** Drawer-friendly aliases. */
  get width(): number {
    return this.size;
  }

  get height(): number {
    return this.size;
  }

  /** BitMatrix-compatible read access. */
  at(x: number, y: number): boolean {
    return this.getModule(x, y);
  }
}
