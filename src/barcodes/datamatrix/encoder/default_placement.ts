export class DefaultPlacement {
  private readonly codewords: Uint8Array;
  private readonly numrows: number;
  private readonly numcols: number;
  private readonly bits: Int8Array;

  constructor(codewords: Uint8Array, numcols: number, numrows: number) {
    this.codewords = codewords;
    this.numcols = numcols;
    this.numrows = numrows;
    this.bits = new Int8Array(numcols * numrows);
    this.bits.fill(-1);
  }

  getBit(col: number, row: number): boolean {
    return this.bits[row * this.numcols + col] === 1;
  }

  private setBit(col: number, row: number, bit: boolean): void {
    this.bits[row * this.numcols + col] = bit ? 1 : 0;
  }

  private hasBit(col: number, row: number): boolean {
    return this.bits[row * this.numcols + col]! >= 0;
  }

  place(): void {
    let pos = 0;
    let row = 4;
    let col = 0;

    for (;;) {
      // repeatedly first check for one of the special corner cases, then...
      if (row === this.numrows && col === 0) {
        this.corner1(pos);
        pos++;
      }
      if (row === this.numrows - 2 && col === 0 && this.numcols % 4 !== 0) {
        this.corner2(pos);
        pos++;
      }
      if (row === this.numrows - 2 && col === 0 && this.numcols % 8 === 4) {
        this.corner3(pos);
        pos++;
      }
      if (row === this.numrows + 4 && col === 2 && this.numcols % 8 === 0) {
        this.corner4(pos);
        pos++;
      }
      // sweep upward diagonally, inserting successive characters...
      for (;;) {
        if (row < this.numrows && col >= 0 && !this.hasBit(col, row)) {
          this.utah(row, col, pos);
          pos++;
        }
        row -= 2;
        col += 2;
        if (row < 0 || col >= this.numcols) {
          break;
        }
      }
      row++;
      col += 3;

      // and then sweep downward diagonally, inserting successive characters, ...
      for (;;) {
        if (row >= 0 && col < this.numcols && !this.hasBit(col, row)) {
          this.utah(row, col, pos);
          pos++;
        }
        row += 2;
        col -= 2;
        if (row >= this.numrows || col < 0) {
          break;
        }
      }
      row += 3;
      col++;

      // ...until the entire array is scanned
      if (row >= this.numrows && col >= this.numcols) {
        break;
      }
    }

    // Lastly, if the lower righthand corner is untouched, fill in fixed pattern
    if (!this.hasBit(this.numcols - 1, this.numrows - 1)) {
      this.setBit(this.numcols - 1, this.numrows - 1, true);
      this.setBit(this.numcols - 2, this.numrows - 2, true);
    }
  }

  private module(rowIn: number, colIn: number, pos: number, bit: number): void {
    let row = rowIn;
    let col = colIn;
    if (row < 0) {
      row += this.numrows;
      col += 4 - ((this.numrows + 4) % 8);
    }
    if (col < 0) {
      col += this.numcols;
      row += 4 - ((this.numcols + 4) % 8);
    }
    let v = this.codewords[pos]!;
    v &= 1 << (8 - bit);
    this.setBit(col, row, v !== 0);
  }

  // utah places the 8 bits of a utah-shaped symbol character in ECC200.
  private utah(row: number, col: number, pos: number): void {
    this.module(row - 2, col - 2, pos, 1);
    this.module(row - 2, col - 1, pos, 2);
    this.module(row - 1, col - 2, pos, 3);
    this.module(row - 1, col - 1, pos, 4);
    this.module(row - 1, col, pos, 5);
    this.module(row, col - 2, pos, 6);
    this.module(row, col - 1, pos, 7);
    this.module(row, col, pos, 8);
  }

  private corner1(pos: number): void {
    this.module(this.numrows - 1, 0, pos, 1);
    this.module(this.numrows - 1, 1, pos, 2);
    this.module(this.numrows - 1, 2, pos, 3);
    this.module(0, this.numcols - 2, pos, 4);
    this.module(0, this.numcols - 1, pos, 5);
    this.module(1, this.numcols - 1, pos, 6);
    this.module(2, this.numcols - 1, pos, 7);
    this.module(3, this.numcols - 1, pos, 8);
  }

  private corner2(pos: number): void {
    this.module(this.numrows - 3, 0, pos, 1);
    this.module(this.numrows - 2, 0, pos, 2);
    this.module(this.numrows - 1, 0, pos, 3);
    this.module(0, this.numcols - 4, pos, 4);
    this.module(0, this.numcols - 3, pos, 5);
    this.module(0, this.numcols - 2, pos, 6);
    this.module(0, this.numcols - 1, pos, 7);
    this.module(1, this.numcols - 1, pos, 8);
  }

  private corner3(pos: number): void {
    this.module(this.numrows - 3, 0, pos, 1);
    this.module(this.numrows - 2, 0, pos, 2);
    this.module(this.numrows - 1, 0, pos, 3);
    this.module(0, this.numcols - 2, pos, 4);
    this.module(0, this.numcols - 1, pos, 5);
    this.module(1, this.numcols - 1, pos, 6);
    this.module(2, this.numcols - 1, pos, 7);
    this.module(3, this.numcols - 1, pos, 8);
  }

  private corner4(pos: number): void {
    this.module(this.numrows - 1, 0, pos, 1);
    this.module(this.numrows - 1, this.numcols - 1, pos, 2);
    this.module(0, this.numcols - 3, pos, 3);
    this.module(0, this.numcols - 2, pos, 4);
    this.module(0, this.numcols - 1, pos, 5);
    this.module(1, this.numcols - 3, pos, 6);
    this.module(1, this.numcols - 2, pos, 7);
    this.module(1, this.numcols - 1, pos, 8);
  }
}

export function newDefaultPlacement(
  codewords: Uint8Array,
  numcols: number,
  numrows: number,
): DefaultPlacement {
  return new DefaultPlacement(codewords, numcols, numrows);
}
