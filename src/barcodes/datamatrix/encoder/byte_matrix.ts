export class ByteMatrix {
  private readonly bytesData: Int8Array[];
  private readonly widthValue: number;
  private readonly heightValue: number;

  constructor(width: number, height: number) {
    this.widthValue = width;
    this.heightValue = height;
    this.bytesData = new Array<Int8Array>(height);
    for (let i = 0; i < height; i++) {
      this.bytesData[i] = new Int8Array(width);
    }
  }

  getHeight(): number {
    return this.heightValue;
  }

  getWidth(): number {
    return this.widthValue;
  }

  get(x: number, y: number): number {
    return this.bytesData[y]![x]!;
  }

  getArray(): Int8Array[] {
    return this.bytesData;
  }

  set(x: number, y: number, value: number): void {
    this.bytesData[y]![x] = value;
  }

  setBool(x: number, y: number, value: boolean): void {
    this.bytesData[y]![x] = value ? 1 : 0;
  }

  clear(value: number): void {
    for (const row of this.bytesData) {
      row.fill(value);
    }
  }

  toString(): string {
    let result = "";
    for (const row of this.bytesData) {
      for (const b of row) {
        if (b === 0) {
          result += " 0";
        } else if (b === 1) {
          result += " 1";
        } else {
          result += "  ";
        }
      }
      result += "\n";
    }
    return result;
  }
}

export function newByteMatrix(width: number, height: number): ByteMatrix {
  return new ByteMatrix(width, height);
}
