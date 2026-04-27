// Port of internal/barcodes/qrcode/encoder/version.go

import { ErrorCorrectionLevel } from "./error-correction-level.ts";

function popCount32(v: number): number {
  let x = v >>> 0;
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  x = (x + (x >>> 4)) & 0x0f0f0f0f;
  return ((x * 0x01010101) >>> 24) & 0xff;
}

export function FormatInformation_NumBitsDiffering(a: number, b: number): number {
  return popCount32((a ^ b) >>> 0);
}

export class ECB {
  count: number;
  dataCodewords: number;

  constructor(count: number, dataCodewords: number) {
    this.count = count;
    this.dataCodewords = dataCodewords;
  }

  getCount(): number {
    return this.count;
  }

  getDataCodewords(): number {
    return this.dataCodewords;
  }
}

export class ECBlocks {
  ecCodewordsPerBlock: number;
  ecBlocks: ECB[];

  constructor(ecCodewordsPerBlock: number, ecBlocks: ECB[]) {
    this.ecCodewordsPerBlock = ecCodewordsPerBlock;
    this.ecBlocks = ecBlocks;
  }

  getECCodewordsPerBlock(): number {
    return this.ecCodewordsPerBlock;
  }

  getNumBlocks(): number {
    let total = 0;
    for (const block of this.ecBlocks) {
      total += block.getCount();
    }
    return total;
  }

  getTotalECCodewords(): number {
    return this.ecCodewordsPerBlock * this.getNumBlocks();
  }

  getECBlocks(): ECB[] {
    return this.ecBlocks;
  }
}

export class Version {
  private versionNumber: number;
  private alignmentPatternCenters: number[];
  private ecBlocks: ECBlocks[];
  private totalCodewords: number;

  constructor(versionNumber: number, alignmentPatternCenters: number[], ecBlocks: ECBlocks[]) {
    this.versionNumber = versionNumber;
    this.alignmentPatternCenters = alignmentPatternCenters;
    this.ecBlocks = ecBlocks;
    let total = 0;
    const ecCodewords = ecBlocks[0]?.getECCodewordsPerBlock() ?? 0;
    const ecbArray = ecBlocks[0]?.getECBlocks() ?? [];
    for (const ecBlock of ecbArray) {
      total += ecBlock.getCount() * (ecBlock.getDataCodewords() + ecCodewords);
    }
    this.totalCodewords = total;
  }

  getVersionNumber(): number {
    return this.versionNumber;
  }

  getAlignmentPatternCenters(): number[] {
    return this.alignmentPatternCenters;
  }

  getTotalCodewords(): number {
    return this.totalCodewords;
  }

  getDimensionForVersion(): number {
    return 17 + 4 * this.versionNumber;
  }

  getECBlocksForLevel(ecLevel: ErrorCorrectionLevel): ECBlocks | null {
    switch (ecLevel) {
      case ErrorCorrectionLevel.L:
        return this.ecBlocks[0] ?? null;
      case ErrorCorrectionLevel.M:
        return this.ecBlocks[1] ?? null;
      case ErrorCorrectionLevel.Q:
        return this.ecBlocks[2] ?? null;
      case ErrorCorrectionLevel.H:
        return this.ecBlocks[3] ?? null;
      default:
        return null;
    }
  }

  toString(): string {
    return String(this.versionNumber);
  }
}

export const VERSION_DECODE_INFO = [
  0x07c94, 0x085bc, 0x09a99, 0x0a4d3, 0x0bbf6, 0x0c762, 0x0d847, 0x0e60d, 0x0f928, 0x10b78, 0x1145d,
  0x12a17, 0x13532, 0x149a6, 0x15683, 0x168c9, 0x177ec, 0x18ec4, 0x191e1, 0x1afab, 0x1b08e, 0x1cc1a,
  0x1d33f, 0x1ed75, 0x1f250, 0x209d5, 0x216f0, 0x228ba, 0x2379f, 0x24b0b, 0x2542e, 0x26a64, 0x27541,
  0x28c69,
];

function v(
  num: number,
  centers: number[],
  l: ECBlocks,
  m: ECBlocks,
  q: ECBlocks,
  h: ECBlocks,
): Version {
  return new Version(num, centers, [l, m, q, h]);
}

function ecb(codewordsPerBlock: number, blocks: [number, number][]): ECBlocks {
  return new ECBlocks(
    codewordsPerBlock,
    blocks.map(([count, dataCodewords]) => new ECB(count, dataCodewords)),
  );
}

export const VERSIONS: Version[] = [
  v(1, [], ecb(7, [[1, 19]]), ecb(10, [[1, 16]]), ecb(13, [[1, 13]]), ecb(17, [[1, 9]])),
  v(2, [6, 18], ecb(10, [[1, 34]]), ecb(16, [[1, 28]]), ecb(22, [[1, 22]]), ecb(28, [[1, 16]])),
  v(3, [6, 22], ecb(15, [[1, 55]]), ecb(26, [[1, 44]]), ecb(18, [[2, 17]]), ecb(22, [[2, 13]])),
  v(4, [6, 26], ecb(20, [[1, 80]]), ecb(18, [[2, 32]]), ecb(26, [[2, 24]]), ecb(16, [[4, 9]])),
  v(
    5,
    [6, 30],
    ecb(26, [[1, 108]]),
    ecb(24, [[2, 43]]),
    ecb(18, [
      [2, 15],
      [2, 16],
    ]),
    ecb(22, [
      [2, 11],
      [2, 12],
    ]),
  ),
  v(6, [6, 34], ecb(18, [[2, 68]]), ecb(16, [[4, 27]]), ecb(24, [[4, 19]]), ecb(28, [[4, 15]])),
  v(
    7,
    [6, 22, 38],
    ecb(20, [[2, 78]]),
    ecb(18, [[4, 31]]),
    ecb(18, [
      [2, 14],
      [4, 15],
    ]),
    ecb(26, [
      [4, 13],
      [1, 14],
    ]),
  ),
  v(
    8,
    [6, 24, 42],
    ecb(24, [[2, 97]]),
    ecb(22, [
      [2, 38],
      [2, 39],
    ]),
    ecb(22, [
      [4, 18],
      [2, 19],
    ]),
    ecb(26, [
      [4, 14],
      [2, 15],
    ]),
  ),
  v(
    9,
    [6, 26, 46],
    ecb(30, [[2, 116]]),
    ecb(22, [
      [3, 36],
      [2, 37],
    ]),
    ecb(20, [
      [4, 16],
      [4, 17],
    ]),
    ecb(24, [
      [4, 12],
      [4, 13],
    ]),
  ),
  v(
    10,
    [6, 28, 50],
    ecb(18, [
      [2, 68],
      [2, 69],
    ]),
    ecb(26, [
      [4, 43],
      [1, 44],
    ]),
    ecb(24, [
      [6, 19],
      [2, 20],
    ]),
    ecb(28, [
      [6, 15],
      [2, 16],
    ]),
  ),
  v(
    11,
    [6, 30, 54],
    ecb(20, [[4, 81]]),
    ecb(30, [
      [1, 50],
      [4, 51],
    ]),
    ecb(28, [
      [4, 22],
      [4, 23],
    ]),
    ecb(24, [
      [3, 12],
      [8, 13],
    ]),
  ),
  v(
    12,
    [6, 32, 58],
    ecb(24, [
      [2, 92],
      [2, 93],
    ]),
    ecb(22, [
      [6, 36],
      [2, 37],
    ]),
    ecb(26, [
      [4, 20],
      [6, 21],
    ]),
    ecb(28, [
      [7, 14],
      [4, 15],
    ]),
  ),
  v(
    13,
    [6, 34, 62],
    ecb(26, [[4, 107]]),
    ecb(22, [
      [8, 37],
      [1, 38],
    ]),
    ecb(24, [
      [8, 20],
      [4, 21],
    ]),
    ecb(22, [
      [12, 11],
      [4, 12],
    ]),
  ),
  v(
    14,
    [6, 26, 46, 66],
    ecb(30, [
      [3, 115],
      [1, 116],
    ]),
    ecb(24, [
      [4, 40],
      [5, 41],
    ]),
    ecb(20, [
      [11, 16],
      [5, 17],
    ]),
    ecb(24, [
      [11, 12],
      [5, 13],
    ]),
  ),
  v(
    15,
    [6, 26, 48, 70],
    ecb(22, [
      [5, 87],
      [1, 88],
    ]),
    ecb(24, [
      [5, 41],
      [5, 42],
    ]),
    ecb(30, [
      [5, 24],
      [7, 25],
    ]),
    ecb(24, [
      [11, 12],
      [7, 13],
    ]),
  ),
  v(
    16,
    [6, 26, 50, 74],
    ecb(24, [
      [5, 98],
      [1, 99],
    ]),
    ecb(28, [
      [7, 45],
      [3, 46],
    ]),
    ecb(24, [
      [15, 19],
      [2, 20],
    ]),
    ecb(30, [
      [3, 15],
      [13, 16],
    ]),
  ),
  v(
    17,
    [6, 30, 54, 78],
    ecb(28, [
      [1, 107],
      [5, 108],
    ]),
    ecb(28, [
      [10, 46],
      [1, 47],
    ]),
    ecb(28, [
      [1, 22],
      [15, 23],
    ]),
    ecb(28, [
      [2, 14],
      [17, 15],
    ]),
  ),
  v(
    18,
    [6, 30, 56, 82],
    ecb(30, [
      [5, 120],
      [1, 121],
    ]),
    ecb(26, [
      [9, 43],
      [4, 44],
    ]),
    ecb(28, [
      [17, 22],
      [1, 23],
    ]),
    ecb(28, [
      [2, 14],
      [19, 15],
    ]),
  ),
  v(
    19,
    [6, 30, 58, 86],
    ecb(28, [
      [3, 113],
      [4, 114],
    ]),
    ecb(26, [
      [3, 44],
      [11, 45],
    ]),
    ecb(26, [
      [17, 21],
      [4, 22],
    ]),
    ecb(26, [
      [9, 13],
      [16, 14],
    ]),
  ),
  v(
    20,
    [6, 34, 62, 90],
    ecb(28, [
      [3, 107],
      [5, 108],
    ]),
    ecb(26, [
      [3, 41],
      [13, 42],
    ]),
    ecb(30, [
      [15, 24],
      [5, 25],
    ]),
    ecb(28, [
      [15, 15],
      [10, 16],
    ]),
  ),
  v(
    21,
    [6, 28, 50, 72, 94],
    ecb(28, [
      [4, 116],
      [4, 117],
    ]),
    ecb(26, [[17, 42]]),
    ecb(28, [
      [17, 22],
      [6, 23],
    ]),
    ecb(30, [
      [19, 16],
      [6, 17],
    ]),
  ),
  v(
    22,
    [6, 26, 50, 74, 98],
    ecb(28, [
      [2, 111],
      [7, 112],
    ]),
    ecb(28, [[17, 46]]),
    ecb(30, [
      [7, 24],
      [16, 25],
    ]),
    ecb(24, [[34, 13]]),
  ),
  v(
    23,
    [6, 30, 54, 78, 102],
    ecb(30, [
      [4, 121],
      [5, 122],
    ]),
    ecb(28, [
      [4, 47],
      [14, 48],
    ]),
    ecb(30, [
      [11, 24],
      [14, 25],
    ]),
    ecb(30, [
      [16, 15],
      [14, 16],
    ]),
  ),
  v(
    24,
    [6, 28, 54, 80, 106],
    ecb(30, [
      [6, 117],
      [4, 118],
    ]),
    ecb(28, [
      [6, 45],
      [14, 46],
    ]),
    ecb(30, [
      [11, 24],
      [16, 25],
    ]),
    ecb(30, [
      [30, 16],
      [2, 17],
    ]),
  ),
  v(
    25,
    [6, 32, 58, 84, 110],
    ecb(26, [
      [8, 106],
      [4, 107],
    ]),
    ecb(28, [
      [8, 47],
      [13, 48],
    ]),
    ecb(30, [
      [7, 24],
      [22, 25],
    ]),
    ecb(30, [
      [22, 15],
      [13, 16],
    ]),
  ),
  v(
    26,
    [6, 30, 58, 86, 114],
    ecb(28, [
      [10, 114],
      [2, 115],
    ]),
    ecb(28, [
      [19, 46],
      [4, 47],
    ]),
    ecb(28, [
      [28, 22],
      [6, 23],
    ]),
    ecb(30, [
      [33, 16],
      [4, 17],
    ]),
  ),
  v(
    27,
    [6, 34, 62, 90, 118],
    ecb(30, [
      [8, 122],
      [4, 123],
    ]),
    ecb(28, [
      [22, 45],
      [3, 46],
    ]),
    ecb(30, [
      [8, 23],
      [26, 24],
    ]),
    ecb(30, [
      [12, 15],
      [28, 16],
    ]),
  ),
  v(
    28,
    [6, 26, 50, 74, 98, 122],
    ecb(30, [
      [3, 117],
      [10, 118],
    ]),
    ecb(28, [
      [3, 45],
      [23, 46],
    ]),
    ecb(30, [
      [4, 24],
      [31, 25],
    ]),
    ecb(30, [
      [11, 15],
      [31, 16],
    ]),
  ),
  v(
    29,
    [6, 30, 54, 78, 102, 126],
    ecb(30, [
      [7, 116],
      [7, 117],
    ]),
    ecb(28, [
      [21, 45],
      [7, 46],
    ]),
    ecb(30, [
      [1, 23],
      [37, 24],
    ]),
    ecb(30, [
      [19, 15],
      [26, 16],
    ]),
  ),
  v(
    30,
    [6, 26, 52, 78, 104, 130],
    ecb(30, [
      [5, 115],
      [10, 116],
    ]),
    ecb(28, [
      [19, 47],
      [10, 48],
    ]),
    ecb(30, [
      [15, 24],
      [25, 25],
    ]),
    ecb(30, [
      [23, 15],
      [25, 16],
    ]),
  ),
  v(
    31,
    [6, 30, 56, 82, 108, 134],
    ecb(30, [
      [13, 115],
      [3, 116],
    ]),
    ecb(28, [
      [2, 46],
      [29, 47],
    ]),
    ecb(30, [
      [42, 24],
      [1, 25],
    ]),
    ecb(30, [
      [23, 15],
      [28, 16],
    ]),
  ),
  v(
    32,
    [6, 34, 60, 86, 112, 138],
    ecb(30, [[17, 115]]),
    ecb(28, [
      [10, 46],
      [23, 47],
    ]),
    ecb(30, [
      [10, 24],
      [35, 25],
    ]),
    ecb(30, [
      [19, 15],
      [35, 16],
    ]),
  ),
  v(
    33,
    [6, 30, 58, 86, 114, 142],
    ecb(30, [
      [17, 115],
      [1, 116],
    ]),
    ecb(28, [
      [14, 46],
      [21, 47],
    ]),
    ecb(30, [
      [29, 24],
      [19, 25],
    ]),
    ecb(30, [
      [11, 15],
      [46, 16],
    ]),
  ),
  v(
    34,
    [6, 34, 62, 90, 118, 146],
    ecb(30, [
      [13, 115],
      [6, 116],
    ]),
    ecb(28, [
      [14, 46],
      [23, 47],
    ]),
    ecb(30, [
      [44, 24],
      [7, 25],
    ]),
    ecb(30, [
      [59, 16],
      [1, 17],
    ]),
  ),
  v(
    35,
    [6, 30, 54, 78, 102, 126, 150],
    ecb(30, [
      [12, 121],
      [7, 122],
    ]),
    ecb(28, [
      [12, 47],
      [26, 48],
    ]),
    ecb(30, [
      [39, 24],
      [14, 25],
    ]),
    ecb(30, [
      [22, 15],
      [41, 16],
    ]),
  ),
  v(
    36,
    [6, 24, 50, 76, 102, 128, 154],
    ecb(30, [
      [6, 121],
      [14, 122],
    ]),
    ecb(28, [
      [6, 47],
      [34, 48],
    ]),
    ecb(30, [
      [46, 24],
      [10, 25],
    ]),
    ecb(30, [
      [2, 15],
      [64, 16],
    ]),
  ),
  v(
    37,
    [6, 28, 54, 80, 106, 132, 158],
    ecb(30, [
      [17, 122],
      [4, 123],
    ]),
    ecb(28, [
      [29, 46],
      [14, 47],
    ]),
    ecb(30, [
      [49, 24],
      [10, 25],
    ]),
    ecb(30, [
      [24, 15],
      [46, 16],
    ]),
  ),
  v(
    38,
    [6, 32, 58, 84, 110, 136, 162],
    ecb(30, [
      [4, 122],
      [18, 123],
    ]),
    ecb(28, [
      [13, 46],
      [32, 47],
    ]),
    ecb(30, [
      [48, 24],
      [14, 25],
    ]),
    ecb(30, [
      [42, 15],
      [32, 16],
    ]),
  ),
  v(
    39,
    [6, 26, 54, 82, 110, 138, 166],
    ecb(30, [
      [20, 117],
      [4, 118],
    ]),
    ecb(28, [
      [40, 47],
      [7, 48],
    ]),
    ecb(30, [
      [43, 24],
      [22, 25],
    ]),
    ecb(30, [
      [10, 15],
      [67, 16],
    ]),
  ),
  v(
    40,
    [6, 30, 58, 86, 114, 142, 170],
    ecb(30, [
      [19, 118],
      [6, 119],
    ]),
    ecb(28, [
      [18, 47],
      [31, 48],
    ]),
    ecb(30, [
      [34, 24],
      [34, 25],
    ]),
    ecb(30, [
      [20, 15],
      [61, 16],
    ]),
  ),
];

export function Version_GetProvisionalVersionForDimension(dimension: number): Version {
  if (dimension % 4 !== 1) {
    throw new Error(`dimension = ${dimension}`);
  }
  return Version_GetVersionForNumber((dimension - 17) / 4);
}

export function Version_GetVersionForNumber(versionNumber: number): Version {
  if (versionNumber < 1 || versionNumber > 40) {
    throw new Error(`IllegalArgumentException: versionNumber = ${versionNumber}`);
  }
  return VERSIONS[versionNumber - 1] as Version;
}

export function Version_decodeVersionInformation(versionBits: number): Version {
  let bestDifference = 0x7fffffff;
  let bestVersion = 0;
  for (let i = 0; i < VERSION_DECODE_INFO.length; i++) {
    const targetVersion = VERSION_DECODE_INFO[i] as number;
    if (targetVersion === versionBits) {
      return Version_GetVersionForNumber(i + 7);
    }
    const bitsDifference = FormatInformation_NumBitsDiffering(versionBits, targetVersion);
    if (bitsDifference < bestDifference) {
      bestVersion = i + 7;
      bestDifference = bitsDifference;
    }
  }

  if (bestDifference <= 3) {
    return Version_GetVersionForNumber(bestVersion);
  }

  throw new Error(`we didn't find a close enough match 0x${versionBits.toString(16)}`);
}
