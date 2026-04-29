// Port of bit_array.go — a packed bit vector backed by Uint32Array.

import { reverse32, trailingZeros32 } from "./bitops.ts";

function makeArray(size: number): Uint32Array {
  return new Uint32Array((size + 31) >>> 5);
}

export class BitArray {
  // bits is a Uint32Array (Go: []uint32) and may be reallocated as the array grows.
  bits: Uint32Array;
  private _size: number;

  constructor(size = 0) {
    this.bits = makeArray(Math.max(size, 0));
    this._size = size;
  }

  // Mirrors Go's NewEmptyBitArray which uses makeArray(1) ⇒ length-1 backing word.
  static empty(): BitArray {
    const a = new BitArray(0);
    a.bits = new Uint32Array(1);
    return a;
  }

  getSize(): number {
    return this._size;
  }

  /** Convenience getter mirroring `Array.length`; same value as `getSize()`. */
  get length(): number {
    return this._size;
  }

  getSizeInBytes(): number {
    return Math.floor((this._size + 7) / 8);
  }

  private ensureCapacity(size: number): void {
    if (size > this.bits.length * 32) {
      const newBits = makeArray(size);
      newBits.set(this.bits);
      this.bits = newBits;
    }
  }

  get(i: number): boolean {
    return (this.bits[Math.floor(i / 32)]! & (1 << (i % 32))) >>> 0 !== 0;
  }

  set(i: number): void {
    const idx = Math.floor(i / 32);
    this.bits[idx] = (this.bits[idx]! | (1 << (i % 32))) >>> 0;
  }

  flip(i: number): void {
    const idx = Math.floor(i / 32);
    this.bits[idx] = (this.bits[idx]! ^ (1 << (i % 32))) >>> 0;
  }

  getNextSet(from: number): number {
    if (from >= this._size) {
      return this._size;
    }
    let bitsOffset = Math.floor(from / 32);
    // Mask off bits below `from` within the current word: -(1 << shift) keeps bits ≥ shift.
    let currentBits = this.bits[bitsOffset]! >>> 0;
    currentBits = (currentBits & (-(1 << (from & 0x1f)) >>> 0)) >>> 0;
    while (currentBits === 0) {
      bitsOffset++;
      if (bitsOffset === this.bits.length) {
        return this._size;
      }
      currentBits = this.bits[bitsOffset]! >>> 0;
    }
    const result = bitsOffset * 32 + trailingZeros32(currentBits);
    return result > this._size ? this._size : result;
  }

  getNextUnset(from: number): number {
    if (from >= this._size) {
      return this._size;
    }
    let bitsOffset = Math.floor(from / 32);
    let currentBits = ~this.bits[bitsOffset]! >>> 0;
    currentBits = (currentBits & (-(1 << (from & 0x1f)) >>> 0)) >>> 0;
    while (currentBits === 0) {
      bitsOffset++;
      if (bitsOffset === this.bits.length) {
        return this._size;
      }
      currentBits = ~this.bits[bitsOffset]! >>> 0;
    }
    const result = bitsOffset * 32 + trailingZeros32(currentBits);
    return result > this._size ? this._size : result;
  }

  setBulk(i: number, newBits: number): void {
    this.bits[Math.floor(i / 32)] = newBits >>> 0;
  }

  setRange(start: number, end: number): void {
    if (end < start || start < 0 || end > this._size) {
      throw new Error("invalid start/end values");
    }
    if (end === start) return;
    const lastInclusive = end - 1;
    const firstInt = Math.floor(start / 32);
    const lastInt = Math.floor(lastInclusive / 32);
    for (let i = firstInt; i <= lastInt; i++) {
      const firstBit = i === firstInt ? start % 32 : 0;
      const lastBit = i === lastInt ? lastInclusive % 32 : 31;
      // Equivalent to Go: (2 << lastBit) - (1 << firstBit) ⇒ a 32-bit mask.
      const mask = (((2 << lastBit) >>> 0) - ((1 << firstBit) >>> 0)) >>> 0;
      this.bits[i] = (this.bits[i]! | mask) >>> 0;
    }
  }

  clear(): void {
    this.bits.fill(0);
  }

  isRange(start: number, end: number, value: boolean): boolean {
    if (end < start || start < 0 || end > this._size) {
      throw new Error("invalid start/end values");
    }
    if (end === start) return true;
    const lastInclusive = end - 1;
    const firstInt = Math.floor(start / 32);
    const lastInt = Math.floor(lastInclusive / 32);
    for (let i = firstInt; i <= lastInt; i++) {
      const firstBit = i === firstInt ? start % 32 : 0;
      const lastBit = i === lastInt ? lastInclusive % 32 : 31;
      const mask = (((2 << lastBit) >>> 0) - ((1 << firstBit) >>> 0)) >>> 0;
      const expect = value ? mask : 0;
      if ((this.bits[i]! & mask) >>> 0 !== expect) {
        return false;
      }
    }
    return true;
  }

  appendBit(bit: boolean): void {
    this.ensureCapacity(this._size + 1);
    if (bit) {
      const idx = Math.floor(this._size / 32);
      this.bits[idx] = (this.bits[idx]! | (1 << (this._size % 32))) >>> 0;
    }
    this._size++;
  }

  appendBits(value: number, numBits: number): void {
    if (numBits < 0 || numBits > 32) {
      throw new Error("num bits must be between 0 and 32");
    }
    let nextSize = this._size;
    this.ensureCapacity(nextSize + numBits);
    for (let numBitsLeft = numBits - 1; numBitsLeft >= 0; numBitsLeft--) {
      if ((value & (1 << numBitsLeft)) !== 0) {
        const idx = Math.floor(nextSize / 32);
        this.bits[idx] = (this.bits[idx]! | (1 << (nextSize & 0x1f))) >>> 0;
      }
      nextSize++;
    }
    this._size = nextSize;
  }

  appendBitArray(other: BitArray): void {
    const otherSize = other._size;
    this.ensureCapacity(this._size + otherSize);
    for (let i = 0; i < otherSize; i++) {
      this.appendBit(other.get(i));
    }
  }

  xor(other: BitArray): void {
    if (this._size !== other._size) {
      throw new Error("sizes don't match");
    }
    for (let i = 0; i < this.bits.length; i++) {
      this.bits[i] = (this.bits[i]! ^ other.bits[i]!) >>> 0;
    }
  }

  toBytes(bitOffset: number, array: Uint8Array, offset: number, numBytes: number): void {
    let off = bitOffset;
    for (let i = 0; i < numBytes; i++) {
      let theByte = 0;
      for (let j = 0; j < 8; j++) {
        if (this.get(off)) {
          theByte |= 1 << (7 - j);
        }
        off++;
      }
      array[offset + i] = theByte & 0xff;
    }
  }

  getBitArray(): Uint32Array {
    return this.bits;
  }

  reverse(): void {
    const newBits = new Uint32Array(this.bits.length);
    const len = Math.floor((this._size - 1) / 32);
    const oldBitsLen = len + 1;
    for (let i = 0; i < oldBitsLen; i++) {
      newBits[len - i] = reverse32(this.bits[i]!);
    }
    if (this._size !== oldBitsLen * 32) {
      const leftOffset = oldBitsLen * 32 - this._size;
      let currentInt = newBits[0]! >>> leftOffset;
      for (let i = 1; i < oldBitsLen; i++) {
        const nextInt = newBits[i]!;
        currentInt = (currentInt | (nextInt << (32 - leftOffset))) >>> 0;
        newBits[i - 1] = currentInt;
        currentInt = nextInt >>> leftOffset;
      }
      newBits[oldBitsLen - 1] = currentInt;
    }
    this.bits = newBits;
  }

  toString(): string {
    let result = "";
    for (let i = 0; i < this._size; i++) {
      if (i % 8 === 0) result += " ";
      result += this.get(i) ? "X" : ".";
    }
    return result;
  }
}

// Mirror Go constructors.
export function newEmptyBitArray(): BitArray {
  return BitArray.empty();
}

export function newBitArray(size: number): BitArray {
  return new BitArray(size);
}
