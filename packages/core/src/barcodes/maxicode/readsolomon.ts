// Port of github.com/ingridhq/maxicode/readsolomon (readsolomon.go).
//
// Reed-Solomon encoder used by the Maxicode primary/secondary check word
// generation. Operates over a Galois field defined by `polynomial`.

export class Encoder {
  private readonly logSize: number;
  private readonly eccSymbols: number;
  private readonly logTable: Int32Array;
  private readonly alogTable: Int32Array;
  private readonly rsPolynomial: Int32Array;

  constructor(polynomial: number, eccSymbols: number, index: number) {
    let size = 0;

    // Find the top bit, and hence the symbol size.
    let b = 1;
    for (; b <= polynomial; b <<= 1) {
      size++;
    }

    size--;
    b >>= 1;

    // Build the log and antilog tables.
    const logSize = (1 << size) - 1;
    const logTable = new Int32Array(logSize + 1);
    const alogTable = new Int32Array(logSize);
    const rsPolynomial = new Int32Array(eccSymbols + 1);

    {
      let p = 1;
      for (let v = 0; v < logSize; v++) {
        alogTable[v] = p;
        logTable[p] = v;
        p <<= 1;
        if ((p & b) !== 0) {
          p ^= polynomial;
        }
      }
    }

    rsPolynomial[0] = 1;
    let idx = index;
    for (let i = 1; i <= eccSymbols; i++) {
      rsPolynomial[i] = 1;
      for (let k = i - 1; k > 0; k--) {
        const rk = rsPolynomial[k]!;
        if (rk !== 0) {
          rsPolynomial[k] = alogTable[(logTable[rk]! + idx) % logSize]!;
        }

        rsPolynomial[k] = (rsPolynomial[k]! ^ rsPolynomial[k - 1]!) >>> 0;
      }

      rsPolynomial[0] = alogTable[(logTable[rsPolynomial[0]!]! + idx) % logSize]!;
      idx++;
    }

    this.logSize = logSize;
    this.eccSymbols = eccSymbols;
    this.logTable = logTable;
    this.alogTable = alogTable;
    this.rsPolynomial = rsPolynomial;
  }

  encode(length: number, data: Uint8Array, ecc: Uint8Array): void {
    const { eccSymbols, logTable, alogTable, rsPolynomial, logSize } = this;

    for (let i = 0; i < length; i++) {
      const m = (ecc[eccSymbols - 1]! ^ data[i]!) & 0xff;

      for (let j = eccSymbols - 1; j > 0; j--) {
        if (m !== 0 && rsPolynomial[j] !== 0) {
          ecc[j] =
            (ecc[j - 1]! ^ alogTable[(logTable[m]! + logTable[rsPolynomial[j]!]!) % logSize]!) &
            0xff;
        } else {
          ecc[j] = ecc[j - 1]!;
        }
      }

      if (m !== 0 && rsPolynomial[0] !== 0) {
        ecc[0] = alogTable[(logTable[m]! + logTable[rsPolynomial[0]!]!) % logSize]! & 0xff;
      } else {
        ecc[0] = 0;
      }
    }
  }
}

export function newEncoder(polynomial: number, eccSymbols: number, index: number): Encoder {
  return new Encoder(polynomial, eccSymbols, index);
}
