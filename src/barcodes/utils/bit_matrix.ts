// Port of bit_matrix.go — a 2D bit matrix backed by Uint32Array.
//
// Image-interface methods (At/Bounds/ColorModel) from the Go original are intentionally
// omitted; rendering belongs to the image module (unit 3).

import { BitArray } from "./bit_array.ts";
import { reverse32 } from "./bitops.ts";

export class BitMatrix {
  private width: number;
  private height: number;
  private rowSize: number;
  bits: Uint32Array;

  constructor(width: number, height: number) {
    if (width < 1 || height < 1) {
      throw new Error("both dimensions must be greater than 0");
    }
    this.width = width;
    this.height = height;
    this.rowSize = Math.floor((width + 31) / 32);
    this.bits = new Uint32Array(this.rowSize * height);
  }

  static square(dimension: number): BitMatrix {
    return new BitMatrix(dimension, dimension);
  }

  get(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    const offset = y * this.rowSize + Math.floor(x / 32);
    return ((this.bits[offset]! >>> (x % 32)) & 1) >>> 0 !== 0;
  }

  set(x: number, y: number): void {
    const offset = y * this.rowSize + Math.floor(x / 32);
    this.bits[offset] = (this.bits[offset]! | (1 << (x % 32))) >>> 0;
  }

  unset(x: number, y: number): void {
    const offset = y * this.rowSize + Math.floor(x / 32);
    this.bits[offset] = (this.bits[offset]! & ~(1 << (x % 32))) >>> 0;
  }

  flip(x: number, y: number): void {
    const offset = y * this.rowSize + Math.floor(x / 32);
    this.bits[offset] = (this.bits[offset]! ^ (1 << (x % 32))) >>> 0;
  }

  flipAll(): void {
    for (let i = 0; i < this.bits.length; i++) {
      this.bits[i] = ~this.bits[i]! >>> 0;
    }
  }

  xor(mask: BitMatrix): void {
    if (this.width !== mask.width || this.height !== mask.height || this.rowSize !== mask.rowSize) {
      throw new Error("input matrix dimensions do not match");
    }
    for (let y = 0; y < this.height; y++) {
      const bOffset = y * this.rowSize;
      const mOffset = y * mask.rowSize;
      for (let x = 0; x < this.rowSize; x++) {
        this.bits[bOffset + x] = (this.bits[bOffset + x]! ^ mask.bits[mOffset + x]!) >>> 0;
      }
    }
  }

  clear(): void {
    this.bits.fill(0);
  }

  setRegion(left: number, top: number, width: number, height: number): void {
    if (top < 0 || left < 0) {
      throw new Error("left and top must be nonnegative");
    }
    if (height < 1 || width < 1) {
      throw new Error("height and width must be at least 1");
    }
    const right = left + width;
    const bottom = top + height;
    if (bottom > this.height || right > this.width) {
      throw new Error("the region must fit inside the matrix");
    }
    for (let y = top; y < bottom; y++) {
      const offset = y * this.rowSize;
      for (let x = left; x < right; x++) {
        const idx = offset + Math.floor(x / 32);
        this.bits[idx] = (this.bits[idx]! | (1 << (x % 32))) >>> 0;
      }
    }
  }

  getRow(y: number, row: BitArray | null): BitArray {
    let r = row;
    if (r === null || r.getSize() < this.width) {
      r = new BitArray(this.width);
    } else {
      r.clear();
    }
    const offset = y * this.rowSize;
    for (let x = 0; x < this.rowSize; x++) {
      r.setBulk(x * 32, this.bits[offset + x]!);
    }
    return r;
  }

  setRow(y: number, row: BitArray): void {
    const offset = y * this.rowSize;
    this.bits.set(row.bits.subarray(0, this.rowSize), offset);
  }

  rotate180(): void {
    const height = this.height;
    const rowSize = this.rowSize;
    for (let i = 0; i < Math.floor(height / 2); i++) {
      const topOffset = i * rowSize;
      const bottomOffset = (height - i) * rowSize - 1;
      for (let j = 0; j < rowSize; j++) {
        const top = topOffset + j;
        const bottom = bottomOffset - j;
        const tmp = this.bits[top]!;
        this.bits[top] = this.bits[bottom]!;
        this.bits[bottom] = tmp;
      }
    }
    if (height % 2 !== 0) {
      const offset = Math.floor((rowSize * (height - 1)) / 2);
      for (let j = 0; j < Math.floor(rowSize / 2); j++) {
        const left = offset + j;
        const right = offset + rowSize - 1 - j;
        const tmp = this.bits[left]!;
        this.bits[left] = this.bits[right]!;
        this.bits[right] = tmp;
      }
    }

    const shift = this.width % 32;
    if (shift !== 0) {
      for (let i = 0; i < height; i++) {
        const offset = rowSize * i;
        this.bits[offset] = (reverse32(this.bits[offset]!) >>> (32 - shift)) >>> 0;
        for (let j = 1; j < rowSize; j++) {
          const curbits = reverse32(this.bits[offset + j]!);
          this.bits[offset + j - 1] = (this.bits[offset + j - 1]! | (curbits << shift)) >>> 0;
          this.bits[offset + j] = (curbits >>> (32 - shift)) >>> 0;
        }
      }
    }
  }

  rotate90(): void {
    const newWidth = this.height;
    const newHeight = this.width;
    const newRowSize = Math.floor((newWidth + 31) / 32);
    const newBits = new Uint32Array(newRowSize * newHeight);

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const offset = y * this.rowSize + Math.floor(x / 32);
        if (((this.bits[offset]! >>> (x & 0x1f)) & 1) !== 0) {
          const newOffset = (newHeight - 1 - x) * newRowSize + Math.floor(y / 32);
          newBits[newOffset] = (newBits[newOffset]! | (1 << (y & 0x1f))) >>> 0;
        }
      }
    }
    this.width = newWidth;
    this.height = newHeight;
    this.rowSize = newRowSize;
    this.bits = newBits;
  }

  // Returns [left, top, width, height] of the bounding box around set bits, or null when empty.
  getEnclosingRectangle(): [number, number, number, number] | null {
    let left = this.width;
    let top = this.height;
    let right = -1;
    let bottom = -1;

    for (let y = 0; y < this.height; y++) {
      for (let x32 = 0; x32 < this.rowSize; x32++) {
        const theBits = this.bits[y * this.rowSize + x32]! >>> 0;
        if (theBits !== 0) {
          if (y < top) top = y;
          if (y > bottom) bottom = y;
          if (x32 * 32 < left) {
            let bit = 0;
            while ((theBits << (31 - bit)) >>> 0 === 0) {
              bit++;
            }
            if (x32 * 32 + bit < left) {
              left = x32 * 32 + bit;
            }
          }
          if (x32 * 32 + 31 > right) {
            let bit = 31;
            while (theBits >>> bit === 0) {
              bit--;
            }
            if (x32 * 32 + bit > right) {
              right = x32 * 32 + bit;
            }
          }
        }
      }
    }

    if (right < left || bottom < top) {
      return null;
    }
    return [left, top, right - left + 1, bottom - top + 1];
  }

  getTopLeftOnBit(): [number, number] | null {
    let bitsOffset = 0;
    while (bitsOffset < this.bits.length && this.bits[bitsOffset] === 0) {
      bitsOffset++;
    }
    if (bitsOffset === this.bits.length) return null;

    const y = Math.floor(bitsOffset / this.rowSize);
    let x = (bitsOffset % this.rowSize) * 32;

    const theBits = this.bits[bitsOffset]! >>> 0;
    let bit = 0;
    while ((theBits << (31 - bit)) >>> 0 === 0) {
      bit++;
    }
    x += bit;
    return [x, y];
  }

  getBottomRightOnBit(): [number, number] | null {
    let bitsOffset = this.bits.length - 1;
    while (bitsOffset >= 0 && this.bits[bitsOffset] === 0) {
      bitsOffset--;
    }
    if (bitsOffset < 0) return null;

    const y = Math.floor(bitsOffset / this.rowSize);
    let x = (bitsOffset % this.rowSize) * 32;

    const theBits = this.bits[bitsOffset]! >>> 0;
    let bit = 31;
    while (theBits >>> bit === 0) {
      bit--;
    }
    x += bit;
    return [x, y];
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getRowSize(): number {
    return this.rowSize;
  }

  // Clones the matrix.
  clone(): BitMatrix {
    const out = new BitMatrix(this.width, this.height);
    out.bits.set(this.bits);
    return out;
  }

  toString(setString = "X ", unsetString = "  ", lineSeparator = "\n"): string {
    let result = "";
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        result += this.get(x, y) ? setString : unsetString;
      }
      result += lineSeparator;
    }
    return result;
  }
}

export function newBitMatrix(width: number, height: number): BitMatrix {
  return new BitMatrix(width, height);
}

export function newSquareBitMatrix(dimension: number): BitMatrix {
  return BitMatrix.square(dimension);
}

export function parseBoolMapToBitMatrix(image: boolean[][]): BitMatrix {
  const height = image.length;
  const width = height > 0 ? image[0]!.length : 0;
  const matrix = new BitMatrix(Math.max(width, 1), Math.max(height, 1));
  for (let i = 0; i < height; i++) {
    const row = image[i]!;
    for (let j = 0; j < width; j++) {
      if (row[j]) matrix.set(j, i);
    }
  }
  return matrix;
}

export function parseStringToBitMatrix(
  stringRepresentation: string,
  setString: string,
  unsetString: string,
): BitMatrix {
  if (stringRepresentation === "") {
    throw new Error("empty string representation");
  }

  const bits: boolean[] = new Array(stringRepresentation.length).fill(false);
  let bitsPos = 0;
  let rowStartPos = 0;
  let rowLength = -1;
  let nRows = 0;
  let pos = 0;
  while (pos < stringRepresentation.length) {
    const c = stringRepresentation[pos]!;
    if (c === "\n" || c === "\r") {
      if (bitsPos > rowStartPos) {
        if (rowLength === -1) {
          rowLength = bitsPos - rowStartPos;
        } else if (bitsPos - rowStartPos !== rowLength) {
          throw new Error("row length do not match");
        }
        rowStartPos = bitsPos;
        nRows++;
      }
      pos++;
    } else if (stringRepresentation.startsWith(setString, pos)) {
      pos += setString.length;
      bits[bitsPos] = true;
      bitsPos++;
    } else if (stringRepresentation.startsWith(unsetString, pos)) {
      pos += unsetString.length;
      bits[bitsPos] = false;
      bitsPos++;
    } else {
      throw new Error(`illegal character encountered: ${stringRepresentation.slice(pos)}`);
    }
  }

  if (bitsPos > rowStartPos) {
    if (rowLength === -1) {
      rowLength = bitsPos - rowStartPos;
    } else if (bitsPos - rowStartPos !== rowLength) {
      throw new Error("row length do not match");
    }
    nRows++;
  }
  const matrix = new BitMatrix(rowLength, nRows);
  for (let i = 0; i < bitsPos; i++) {
    if (bits[i]) {
      matrix.set(i % rowLength, Math.floor(i / rowLength));
    }
  }
  return matrix;
}
