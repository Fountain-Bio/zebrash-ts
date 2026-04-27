// Port of internal/barcodes/qrcode/encoder/mask_util.go

import type { ByteMatrix } from "./byte-matrix.ts";

// Penalty weights from section 6.8.2.1
const maskUtilN1 = 3;
const maskUtilN2 = 3;
const maskUtilN3 = 40;
const maskUtilN4 = 10;

export function MaskUtil_applyMaskPenaltyRule1(matrix: ByteMatrix): number {
  return applyMaskPenaltyRule1Internal(matrix, true) + applyMaskPenaltyRule1Internal(matrix, false);
}

export function MaskUtil_applyMaskPenaltyRule2(matrix: ByteMatrix): number {
  let penalty = 0;
  const array = matrix.getArray();
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  for (let y = 0; y < height - 1; y++) {
    const arrayY = array[y] as Int8Array;
    const arrayYNext = array[y + 1] as Int8Array;
    for (let x = 0; x < width - 1; x++) {
      const value = arrayY[x] as number;
      if (value === arrayY[x + 1] && value === arrayYNext[x] && value === arrayYNext[x + 1]) {
        penalty++;
      }
    }
  }
  return maskUtilN2 * penalty;
}

export function MaskUtil_applyMaskPenaltyRule3(matrix: ByteMatrix): number {
  let numPenalties = 0;
  const array = matrix.getArray();
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const arrayY = array[y] as Int8Array;
      if (
        x + 6 < width &&
        arrayY[x] === 1 &&
        arrayY[x + 1] === 0 &&
        arrayY[x + 2] === 1 &&
        arrayY[x + 3] === 1 &&
        arrayY[x + 4] === 1 &&
        arrayY[x + 5] === 0 &&
        arrayY[x + 6] === 1 &&
        (isWhiteHorizontal(arrayY, x - 4, x) || isWhiteHorizontal(arrayY, x + 7, x + 11))
      ) {
        numPenalties++;
      }
      if (
        y + 6 < height &&
        (array[y] as Int8Array)[x] === 1 &&
        (array[y + 1] as Int8Array)[x] === 0 &&
        (array[y + 2] as Int8Array)[x] === 1 &&
        (array[y + 3] as Int8Array)[x] === 1 &&
        (array[y + 4] as Int8Array)[x] === 1 &&
        (array[y + 5] as Int8Array)[x] === 0 &&
        (array[y + 6] as Int8Array)[x] === 1 &&
        (isWhiteVertical(array, x, y - 4, y) || isWhiteVertical(array, x, y + 7, y + 11))
      ) {
        numPenalties++;
      }
    }
  }
  return numPenalties * maskUtilN3;
}

function isWhiteHorizontal(rowArray: Int8Array, fromIn: number, toIn: number): boolean {
  const from = fromIn < 0 ? 0 : fromIn;
  const to = toIn > rowArray.length ? rowArray.length : toIn;
  for (let i = from; i < to; i++) {
    if (rowArray[i] === 1) {
      return false;
    }
  }
  return true;
}

function isWhiteVertical(array: Int8Array[], col: number, fromIn: number, toIn: number): boolean {
  const from = fromIn < 0 ? 0 : fromIn;
  const to = toIn > array.length ? array.length : toIn;
  for (let i = from; i < to; i++) {
    if ((array[i] as Int8Array)[col] === 1) {
      return false;
    }
  }
  return true;
}

export function MaskUtil_applyMaskPenaltyRule4(matrix: ByteMatrix): number {
  let numDarkCells = 0;
  const array = matrix.getArray();
  const width = matrix.getWidth();
  const height = matrix.getHeight();
  for (let y = 0; y < height; y++) {
    const arrayY = array[y] as Int8Array;
    for (let x = 0; x < width; x++) {
      if (arrayY[x] === 1) {
        numDarkCells++;
      }
    }
  }
  const numTotalCells = matrix.getHeight() * matrix.getWidth();
  let distance = numDarkCells * 2 - numTotalCells;
  if (distance < 0) {
    distance = -distance;
  }
  const fivePercentVariances = Math.floor((distance * 10) / numTotalCells);
  return fivePercentVariances * maskUtilN4;
}

export function MaskUtil_getDataMaskBit(maskPattern: number, x: number, y: number): boolean {
  let intermediate: number;
  switch (maskPattern) {
    case 0:
      intermediate = (y + x) & 0x1;
      break;
    case 1:
      intermediate = y & 0x1;
      break;
    case 2:
      intermediate = x % 3;
      break;
    case 3:
      intermediate = (y + x) % 3;
      break;
    case 4:
      intermediate = (Math.floor(y / 2) + Math.floor(x / 3)) & 0x1;
      break;
    case 5: {
      const temp = y * x;
      intermediate = (temp & 0x1) + (temp % 3);
      break;
    }
    case 6: {
      const temp = y * x;
      intermediate = ((temp & 0x1) + (temp % 3)) & 0x1;
      break;
    }
    case 7: {
      const temp = y * x;
      intermediate = ((temp % 3) + ((y + x) & 0x1)) & 0x1;
      break;
    }
    default:
      throw new Error(`IllegalArgumentException: Invalid mask pattern: ${maskPattern}`);
  }
  return intermediate === 0;
}

function applyMaskPenaltyRule1Internal(matrix: ByteMatrix, isHorizontal: boolean): number {
  let penalty = 0;
  let iLimit = matrix.getWidth();
  let jLimit = matrix.getHeight();
  if (isHorizontal) {
    const tmp = iLimit;
    iLimit = jLimit;
    jLimit = tmp;
  }
  const array = matrix.getArray();
  for (let i = 0; i < iLimit; i++) {
    let numSameBitCells = 0;
    let prevBit = -1;
    for (let j = 0; j < jLimit; j++) {
      const bit = isHorizontal
        ? ((array[i] as Int8Array)[j] as number)
        : ((array[j] as Int8Array)[i] as number);
      if (bit === prevBit) {
        numSameBitCells++;
      } else {
        if (numSameBitCells >= 5) {
          penalty += maskUtilN1 + (numSameBitCells - 5);
        }
        numSameBitCells = 1;
        prevBit = bit;
      }
    }
    if (numSameBitCells >= 5) {
      penalty += maskUtilN1 + (numSameBitCells - 5);
    }
  }
  return penalty;
}
