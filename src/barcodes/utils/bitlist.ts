// Port of bitlist.go — an alternative bit list with grow-on-append semantics
// and MSB-first bit ordering within each 32-bit word (Go uses []int32).

// BitList is a list that contains bits.
export class BitList {
  private count: number;
  // Backed by Int32Array — Go uses []int32. Bit operations match Go's signed-int32 behaviour.
  data: Int32Array;

  // Constructs a BitList with capacity for `capacity` bits, all initialized to false.
  constructor(capacity: number) {
    this.count = 0;
    const x = capacity % 32 !== 0 ? 1 : 0;
    this.data = new Int32Array(Math.floor(capacity / 32) + x);
  }

  // Returns the number of contained bits.
  len(): number {
    return this.count;
  }

  private grow(): void {
    let growBy = this.data.length;
    if (growBy < 128) {
      growBy = 128;
    } else if (growBy >= 1024) {
      growBy = 1024;
    }
    const nd = new Int32Array(this.data.length + growBy);
    nd.set(this.data);
    this.data = nd;
  }

  // Appends the given bits to the end of the list.
  addBit(...bits: boolean[]): void {
    for (const bit of bits) {
      let itmIndex = Math.floor(this.count / 32);
      while (itmIndex >= this.data.length) {
        this.grow();
        itmIndex = Math.floor(this.count / 32);
      }
      this.setBit(this.count, bit);
      this.count++;
    }
  }

  // Sets the bit at the given index to the given value.
  setBit(index: number, value: boolean): void {
    const itmIndex = Math.floor(index / 32);
    const itmBitShift = 31 - (index % 32);
    if (value) {
      this.data[itmIndex] = this.data[itmIndex]! | (1 << itmBitShift);
    } else {
      this.data[itmIndex] = this.data[itmIndex]! & ~(1 << itmBitShift);
    }
  }

  // Returns the bit at the given index.
  getBit(index: number): boolean {
    const itmIndex = Math.floor(index / 32);
    const itmBitShift = 31 - (index % 32);
    return ((this.data[itmIndex]! >> itmBitShift) & 1) === 1;
  }

  // Appends all 8 bits of the given byte to the end of the list.
  addByte(b: number): void {
    for (let i = 7; i >= 0; i--) {
      this.addBit(((b >> i) & 1) === 1);
    }
  }

  // Appends the last (LSB) `count` bits of `b` to the end of the list.
  addBits(b: number, count: number): void {
    for (let i = count - 1; i >= 0; i--) {
      this.addBit(((b >> i) & 1) === 1);
    }
  }

  // Returns all bits of the BitList as a Uint8Array.
  getBytes(): Uint8Array {
    let len = this.count >> 3;
    if (this.count % 8 !== 0) {
      len++;
    }
    const result = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      const shift = (3 - (i % 4)) * 8;
      result[i] = (this.data[Math.floor(i / 4)]! >> shift) & 0xff;
    }
    return result;
  }

  // Yields all bytes contained in the BitList (analogous to Go's IterateBytes channel).
  *iterateBytes(): Generator<number, void, unknown> {
    let c = this.count;
    let shift = 24;
    let i = 0;
    while (c > 0) {
      yield (this.data[i]! >> shift) & 0xff;
      shift -= 8;
      if (shift < 0) {
        shift = 24;
        i++;
      }
      c -= 8;
    }
  }
}

export function newBitList(capacity: number): BitList {
  return new BitList(capacity);
}
