// Port of internal/barcodes/qrcode/encoder/byte_matrix.go

export class ByteMatrix {
  private bytesArr: Int8Array[];
  private widthVal: number;
  private heightVal: number;

  constructor(width: number, height: number) {
    this.widthVal = width;
    this.heightVal = height;
    this.bytesArr = new Array<Int8Array>(height);
    for (let i = 0; i < height; i++) {
      this.bytesArr[i] = new Int8Array(width);
    }
  }

  getHeight(): number {
    return this.heightVal;
  }

  getWidth(): number {
    return this.widthVal;
  }

  get(x: number, y: number): number {
    return (this.bytesArr[y] as Int8Array)[x] as number;
  }

  getArray(): Int8Array[] {
    return this.bytesArr;
  }

  set(x: number, y: number, value: number): void {
    (this.bytesArr[y] as Int8Array)[x] = value;
  }

  setBool(x: number, y: number, value: boolean): void {
    (this.bytesArr[y] as Int8Array)[x] = value ? 1 : 0;
  }

  clear(value: number): void {
    for (let y = 0; y < this.heightVal; y++) {
      (this.bytesArr[y] as Int8Array).fill(value);
    }
  }

  toString(): string {
    let out = "";
    for (let y = 0; y < this.heightVal; y++) {
      const row = this.bytesArr[y] as Int8Array;
      for (let x = 0; x < this.widthVal; x++) {
        const b = row[x];
        if (b === 0) {
          out += " 0";
        } else if (b === 1) {
          out += " 1";
        } else {
          out += "  ";
        }
      }
      out += "\n";
    }
    return out;
  }
}
