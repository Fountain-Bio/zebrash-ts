// Port of internal/barcodes/qrcode/encoder/matrix_util.go

import { BitArray } from "../../utils/bit-array.ts";
import type { ByteMatrix } from "./byte-matrix.ts";
import {
  type ErrorCorrectionLevel,
  ErrorCorrectionLevel_GetBits,
} from "./error-correction-level.ts";
import { MaskUtil_getDataMaskBit } from "./mask-util.ts";
import { QRCode_IsValidMaskPattern } from "./qrcode.ts";
import type { Version } from "./version.ts";

const matrixUtil_POSITION_DETECTION_PATTERN: ReadonlyArray<readonly number[]> = [
  [1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

const matrixUtil_POSITION_ADJUSTMENT_PATTERN: ReadonlyArray<readonly number[]> = [
  [1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1],
];

// From Appendix E. Table 1, JIS0510X:2004 (p 71). Verbatim from Go.
const matrixUtil_POSITION_ADJUSTMENT_PATTERN_COORDINATE_TABLE: ReadonlyArray<readonly number[]> = [
  [-1, -1, -1, -1, -1, -1, -1], // Version 1
  [6, 18, -1, -1, -1, -1, -1], // Version 2
  [6, 22, -1, -1, -1, -1, -1], // Version 3
  [6, 26, -1, -1, -1, -1, -1], // Version 4
  [6, 30, -1, -1, -1, -1, -1], // Version 5
  [6, 34, -1, -1, -1, -1, -1], // Version 6
  [6, 22, 38, -1, -1, -1, -1], // Version 7
  [6, 24, 42, -1, -1, -1, -1], // Version 8
  [6, 26, 46, -1, -1, -1, -1], // Version 9
  [6, 28, 50, -1, -1, -1, -1], // Version 10
  [6, 30, 54, -1, -1, -1, -1], // Version 11
  [6, 32, 58, -1, -1, -1, -1], // Version 12
  [6, 34, 62, -1, -1, -1, -1], // Version 13
  [6, 26, 46, 66, -1, -1, -1], // Version 14
  [6, 26, 48, 70, -1, -1, -1], // Version 15
  [6, 26, 50, 74, -1, -1, -1], // Version 16
  [6, 30, 54, 78, -1, -1, -1], // Version 17
  [6, 30, 56, 82, -1, -1, -1], // Version 18
  [6, 30, 58, 86, -1, -1, -1], // Version 19
  [6, 34, 62, 90, -1, -1, -1], // Version 20
  [6, 28, 50, 72, 94, -1, -1], // Version 21
  [6, 26, 50, 74, 98, -1, -1], // Version 22
  [6, 30, 54, 78, 102, -1, -1], // Version 23
  [6, 28, 54, 80, 106, -1, -1], // Version 24
  [6, 32, 58, 84, 110, -1, -1], // Version 25
  [6, 30, 58, 86, 114, -1, -1], // Version 26
  [6, 34, 62, 90, 118, -1, -1], // Version 27
  [6, 26, 50, 74, 98, 122, -1], // Version 28
  [6, 30, 54, 78, 102, 126, -1], // Version 29
  [6, 26, 52, 78, 104, 130, -1], // Version 30
  [6, 30, 56, 82, 108, 134, -1], // Version 31
  [6, 34, 60, 86, 112, 138, -1], // Version 32
  [6, 30, 58, 86, 114, 142, -1], // Version 33
  [6, 34, 62, 90, 118, 146, -1], // Version 34
  [6, 30, 54, 78, 102, 126, 150], // Version 35
  [6, 24, 50, 76, 102, 128, 154], // Version 36
  [6, 28, 54, 80, 106, 132, 158], // Version 37
  [6, 32, 58, 84, 110, 136, 162], // Version 38
  [6, 26, 54, 82, 110, 138, 166], // Version 39
  [6, 30, 58, 86, 114, 142, 170], // Version 40
];

// Type info cells at the left top corner.
const matrixUtil_TYPE_INFO_COORDINATES: ReadonlyArray<readonly [number, number]> = [
  [8, 0],
  [8, 1],
  [8, 2],
  [8, 3],
  [8, 4],
  [8, 5],
  [8, 7],
  [8, 8],
  [7, 8],
  [5, 8],
  [4, 8],
  [3, 8],
  [2, 8],
  [1, 8],
  [0, 8],
];

// From Appendix D in JISX0510:2004 (p. 67)
const matrixUtil_VERSION_INFO_POLY = 0x1f25; // 1 1111 0010 0101

// From Appendix C in JISX0510:2004 (p.65).
const matrixUtil_TYPE_INFO_POLY = 0x537;
const matrixUtil_TYPE_INFO_MASK_PATTERN = 0x5412;

function clearMatrix(matrix: ByteMatrix): void {
  matrix.clear(-1);
}

export function MatrixUtil_buildMatrix(
  dataBits: BitArray,
  ecLevel: ErrorCorrectionLevel,
  version: Version,
  maskPattern: number,
  matrix: ByteMatrix,
): void {
  clearMatrix(matrix);

  embedBasicPatterns(version, matrix);
  // Type information appear with any version.
  embedTypeInfo(ecLevel, maskPattern, matrix);
  // Version info appear if version >= 7.
  maybeEmbedVersionInfo(version, matrix);
  // Data should be embedded at end.
  embedDataBits(dataBits, maskPattern, matrix);
}

function embedBasicPatterns(version: Version, matrix: ByteMatrix): void {
  embedPositionDetectionPatternsAndSeparators(matrix);
  embedDarkDotAtLeftBottomCorner(matrix);
  maybeEmbedPositionAdjustmentPatterns(version, matrix);
  embedTimingPatterns(matrix);
}

function embedTypeInfo(
  ecLevel: ErrorCorrectionLevel,
  maskPattern: number,
  matrix: ByteMatrix,
): void {
  const typeInfoBits = new BitArray();
  makeTypeInfoBits(ecLevel, maskPattern, typeInfoBits);

  for (let i = 0; i < typeInfoBits.getSize(); i++) {
    // Place bits in LSB to MSB order.
    const bit = typeInfoBits.get(typeInfoBits.getSize() - 1 - i);

    const coordinates = matrixUtil_TYPE_INFO_COORDINATES[i] as readonly [number, number];
    const x1 = coordinates[0];
    const y1 = coordinates[1];
    matrix.setBool(x1, y1, bit);

    let x2: number;
    let y2: number;
    if (i < 8) {
      x2 = matrix.getWidth() - i - 1;
      y2 = 8;
    } else {
      x2 = 8;
      y2 = matrix.getHeight() - 7 + (i - 8);
      matrix.setBool(x2, y2, bit);
    }
    matrix.setBool(x2, y2, bit);
  }
}

function maybeEmbedVersionInfo(version: Version, matrix: ByteMatrix): void {
  if (version.getVersionNumber() < 7) {
    return;
  }
  const versionInfoBits = new BitArray();
  makeVersionInfoBits(version, versionInfoBits);

  let bitIndex = 6 * 3 - 1;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 3; j++) {
      const bit = versionInfoBits.get(bitIndex);
      bitIndex--;
      // Left bottom corner.
      matrix.setBool(i, matrix.getHeight() - 11 + j, bit);
      // Right bottom corner.
      matrix.setBool(matrix.getHeight() - 11 + j, i, bit);
    }
  }
}

function embedDataBits(dataBits: BitArray, maskPattern: number, matrix: ByteMatrix): void {
  let bitIndex = 0;
  let direction = -1;
  let x = matrix.getWidth() - 1;
  let y = matrix.getHeight() - 1;
  while (x > 0) {
    if (x === 6) {
      x -= 1;
    }
    while (y >= 0 && y < matrix.getHeight()) {
      for (let i = 0; i < 2; i++) {
        const xx = x - i;
        if (!isEmpty(matrix.get(xx, y))) {
          continue;
        }
        let bit: boolean;
        if (bitIndex < dataBits.getSize()) {
          bit = dataBits.get(bitIndex);
          bitIndex++;
        } else {
          bit = false;
        }

        if (maskPattern !== -1) {
          const maskBit = MaskUtil_getDataMaskBit(maskPattern, xx, y);
          if (maskBit) {
            bit = !bit;
          }
        }
        matrix.setBool(xx, y, bit);
      }
      y += direction;
    }
    direction = -direction;
    y += direction;
    x -= 2;
  }
  if (bitIndex !== dataBits.getSize()) {
    throw new Error(`not all bits consumed: ${bitIndex}/${dataBits.getSize()}`);
  }
}

function findMSBSet(value: number): number {
  if (value === 0) {
    return 0;
  }
  let v = value >>> 0;
  let n = 0;
  while (v !== 0) {
    n++;
    v >>>= 1;
  }
  return n;
}

export function calculateBCHCode(value: number, poly: number): number {
  if (poly === 0) {
    throw new Error("IllegalArgumentException: 0 polynomial");
  }
  const msbSetInPoly = findMSBSet(poly);
  let v = value << (msbSetInPoly - 1);
  while (findMSBSet(v) >= msbSetInPoly) {
    v ^= poly << (findMSBSet(v) - msbSetInPoly);
  }
  return v;
}

function makeTypeInfoBits(
  ecLevel: ErrorCorrectionLevel,
  maskPattern: number,
  bits: BitArray,
): void {
  if (!QRCode_IsValidMaskPattern(maskPattern)) {
    throw new Error("invalid mask pattern");
  }
  const typeInfo = (ErrorCorrectionLevel_GetBits(ecLevel) << 3) | maskPattern;
  bits.appendBits(typeInfo, 5);

  const bchCode = calculateBCHCode(typeInfo, matrixUtil_TYPE_INFO_POLY);
  bits.appendBits(bchCode, 10);

  const maskBits = new BitArray();
  maskBits.appendBits(matrixUtil_TYPE_INFO_MASK_PATTERN, 15);
  bits.xor(maskBits);

  if (bits.getSize() !== 15) {
    throw new Error(`should not happen but we got: ${bits.getSize()}`);
  }
}

function makeVersionInfoBits(version: Version, bits: BitArray): void {
  bits.appendBits(version.getVersionNumber(), 6);
  const bchCode = calculateBCHCode(version.getVersionNumber(), matrixUtil_VERSION_INFO_POLY);
  bits.appendBits(bchCode, 12);

  if (bits.getSize() !== 18) {
    throw new Error(`should not happen but we got: ${bits.getSize()}`);
  }
}

function isEmpty(value: number): boolean {
  return value === -1;
}

function embedTimingPatterns(matrix: ByteMatrix): void {
  for (let i = 8; i < matrix.getWidth() - 8; i++) {
    const bit = (i + 1) % 2;
    if (isEmpty(matrix.get(i, 6))) {
      matrix.set(i, 6, bit);
    }
    if (isEmpty(matrix.get(6, i))) {
      matrix.set(6, i, bit);
    }
  }
}

function embedDarkDotAtLeftBottomCorner(matrix: ByteMatrix): void {
  if (matrix.get(8, matrix.getHeight() - 8) === 0) {
    throw new Error("embedDarkDotAtLeftBottomCorner");
  }
  matrix.set(8, matrix.getHeight() - 8, 1);
}

function embedHorizontalSeparationPattern(
  xStart: number,
  yStart: number,
  matrix: ByteMatrix,
): void {
  for (let x = 0; x < 8; x++) {
    if (!isEmpty(matrix.get(xStart + x, yStart))) {
      throw new Error(`embedHorizontalSeparationPattern(${xStart}, ${yStart})`);
    }
    matrix.set(xStart + x, yStart, 0);
  }
}

function embedVerticalSeparationPattern(xStart: number, yStart: number, matrix: ByteMatrix): void {
  for (let y = 0; y < 7; y++) {
    if (!isEmpty(matrix.get(xStart, yStart + y))) {
      throw new Error(`embedVerticalSeparationPattern(${xStart}, ${yStart})`);
    }
    matrix.set(xStart, yStart + y, 0);
  }
}

function embedPositionAdjustmentPattern(xStart: number, yStart: number, matrix: ByteMatrix): void {
  for (let y = 0; y < 5; y++) {
    const patternY = matrixUtil_POSITION_ADJUSTMENT_PATTERN[y] as readonly number[];
    for (let x = 0; x < 5; x++) {
      matrix.set(xStart + x, yStart + y, patternY[x] as number);
    }
  }
}

function embedPositionDetectionPattern(xStart: number, yStart: number, matrix: ByteMatrix): void {
  for (let y = 0; y < 7; y++) {
    const patternY = matrixUtil_POSITION_DETECTION_PATTERN[y] as readonly number[];
    for (let x = 0; x < 7; x++) {
      matrix.set(xStart + x, yStart + y, patternY[x] as number);
    }
  }
}

function embedPositionDetectionPatternsAndSeparators(matrix: ByteMatrix): void {
  const pdpWidth = (matrixUtil_POSITION_DETECTION_PATTERN[0] as readonly number[]).length;
  embedPositionDetectionPattern(0, 0, matrix);
  embedPositionDetectionPattern(matrix.getWidth() - pdpWidth, 0, matrix);
  embedPositionDetectionPattern(0, matrix.getWidth() - pdpWidth, matrix);

  const hspWidth = 8;
  embedHorizontalSeparationPattern(0, hspWidth - 1, matrix);
  embedHorizontalSeparationPattern(matrix.getWidth() - hspWidth, hspWidth - 1, matrix);
  embedHorizontalSeparationPattern(0, matrix.getWidth() - hspWidth, matrix);

  const vspSize = 7;
  embedVerticalSeparationPattern(vspSize, 0, matrix);
  embedVerticalSeparationPattern(matrix.getHeight() - vspSize - 1, 0, matrix);
  embedVerticalSeparationPattern(vspSize, matrix.getHeight() - vspSize, matrix);
}

function maybeEmbedPositionAdjustmentPatterns(version: Version, matrix: ByteMatrix): void {
  if (version.getVersionNumber() < 2) {
    return;
  }
  const index = version.getVersionNumber() - 1;
  const coordinates = matrixUtil_POSITION_ADJUSTMENT_PATTERN_COORDINATE_TABLE[
    index
  ] as readonly number[];
  for (const y of coordinates) {
    if (y >= 0) {
      for (const x of coordinates) {
        if (x >= 0 && isEmpty(matrix.get(x, y))) {
          embedPositionAdjustmentPattern(x - 2, y - 2, matrix);
        }
      }
    }
  }
}
