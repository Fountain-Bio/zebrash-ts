import { BitList } from "../utils/index.js";
import { AztecCode } from "./azteccode.js";
import { generateCheckWords } from "./errorcorrection.js";
import { highlevelEncode } from "./highlevel.js";

/** ZPL default ECC percentage. */
export const DEFAULT_EC_PERCENT = 23;
export const DEFAULT_LAYERS = 0;

const MAX_NB_BITS = 32;
const MAX_NB_BITS_COMPACT = 4;

/**
 * Per-layer-count word sizes (in bits) per the Aztec spec. Index 0 is unused.
 * Values mirror the Go reference implementation.
 */
const WORD_SIZE = [
  4, 6, 6, 8, 8, 8, 8, 8, 8, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 12, 12, 12, 12,
  12, 12, 12, 12, 12, 12,
] as const;

function totalBitsInLayer(layers: number, compact: boolean): number {
  const tmp = compact ? 88 : 112;
  return (tmp + 16 * layers) * layers;
}

/**
 * Bit-stuffing per the Aztec spec: words that are all-ones or all-zeros
 * (modulo the LSB) are perturbed and the offending bit is re-emitted next.
 */
export function stuffBits(bits: BitList, wordSize: number): BitList {
  const out = new BitList();
  const n = bits.len();
  const mask = (1 << wordSize) - 2;
  for (let i = 0; i < n; i += wordSize) {
    let word = 0;
    for (let j = 0; j < wordSize; j++) {
      if (i + j >= n || bits.getBit(i + j)) {
        word |= 1 << (wordSize - 1 - j);
      }
    }
    switch (word & mask) {
      case mask:
        out.addBits(word & mask, wordSize);
        i--;
        break;
      case 0:
        out.addBits(word | 1, wordSize);
        i--;
        break;
      default:
        out.addBits(word, wordSize);
    }
  }
  return out;
}

export function generateModeMessage(
  compact: boolean,
  layers: number,
  messageSizeInWords: number,
): BitList {
  const modeMessage = new BitList();
  if (compact) {
    modeMessage.addBits(layers - 1, 2);
    modeMessage.addBits(messageSizeInWords - 1, 6);
    return generateCheckWords(modeMessage, 28, 4);
  }
  modeMessage.addBits(layers - 1, 5);
  modeMessage.addBits(messageSizeInWords - 1, 11);
  return generateCheckWords(modeMessage, 40, 4);
}

function drawModeMessage(
  matrix: AztecCode,
  compact: boolean,
  matrixSize: number,
  modeMessage: BitList,
): void {
  const center = Math.trunc(matrixSize / 2);
  if (compact) {
    for (let i = 0; i < 7; i++) {
      const offset = center - 3 + i;
      if (modeMessage.getBit(i)) matrix.set(offset, center - 5);
      if (modeMessage.getBit(i + 7)) matrix.set(center + 5, offset);
      if (modeMessage.getBit(20 - i)) matrix.set(offset, center + 5);
      if (modeMessage.getBit(27 - i)) matrix.set(center - 5, offset);
    }
  } else {
    for (let i = 0; i < 10; i++) {
      const offset = center - 5 + i + Math.trunc(i / 5);
      if (modeMessage.getBit(i)) matrix.set(offset, center - 7);
      if (modeMessage.getBit(i + 10)) matrix.set(center + 7, offset);
      if (modeMessage.getBit(29 - i)) matrix.set(offset, center + 7);
      if (modeMessage.getBit(39 - i)) matrix.set(center - 7, offset);
    }
  }
}

function drawBullsEye(matrix: AztecCode, center: number, size: number): void {
  for (let i = 0; i < size; i += 2) {
    for (let j = center - i; j <= center + i; j++) {
      matrix.set(j, center - i);
      matrix.set(j, center + i);
      matrix.set(center - i, j);
      matrix.set(center + i, j);
    }
  }
  // Corner anchors of the bullseye.
  matrix.set(center - size, center - size);
  matrix.set(center - size + 1, center - size);
  matrix.set(center - size, center - size + 1);
  matrix.set(center + size, center - size);
  matrix.set(center + size, center - size + 1);
  matrix.set(center + size, center - size - 1);
}

export interface EncodeOptions {
  /** Minimum ECC percentage (defaults to DEFAULT_EC_PERCENT, 23, ZPL default). */
  minECCPercent?: number;
  /** Override layer count: positive for full Aztec, negative for compact. */
  userSpecifiedLayers?: number;
}

/**
 * Encode `data` as an Aztec barcode. Returns the bit-matrix; converting to a
 * raster image is the caller's responsibility (handled by the drawer layer).
 */
export function encode(data: Uint8Array, options: EncodeOptions = {}): AztecCode {
  const minECCPercent = options.minECCPercent ?? DEFAULT_EC_PERCENT;
  const userSpecifiedLayers = options.userSpecifiedLayers ?? DEFAULT_LAYERS;

  const bits = highlevelEncode(data);
  let layers = 0;
  let totalBitsInLayerVal = 0;
  let wordSize = 0;
  let compact = false;
  let stuffedBits: BitList;

  if (userSpecifiedLayers !== DEFAULT_LAYERS) {
    // Caller forced the symbol size: compact when negative.
    compact = userSpecifiedLayers < 0;
    layers = compact ? -userSpecifiedLayers : userSpecifiedLayers;
    if ((compact && layers > MAX_NB_BITS_COMPACT) || (!compact && layers > MAX_NB_BITS)) {
      throw new Error(`illegal value ${userSpecifiedLayers} for layers`);
    }
    totalBitsInLayerVal = totalBitsInLayer(layers, compact);
    wordSize = WORD_SIZE[layers] ?? 0;
    const usableBitsInLayers = totalBitsInLayerVal - (totalBitsInLayerVal % wordSize);
    stuffedBits = stuffBits(bits, wordSize);

    if ((stuffedBits.len() * 4) / 3 > usableBitsInLayers) {
      throw new Error("data too large for user specified layer");
    }
    if (compact && stuffedBits.len() > wordSize * 64) {
      throw new Error("data too large for user specified layer");
    }
  } else {
    // Dynamic sizing: pick the smallest symbol where data fits with the
    // requested ECC budget. ZPL uses ceil(totalWords*ecc/100)+3 ECC words.
    wordSize = 0;
    stuffedBits = new BitList();
    let i = 0;
    for (; ; i++) {
      if (i > MAX_NB_BITS) {
        throw new Error("data too large for an aztec code");
      }
      compact = i <= 3;
      layers = compact ? i + 1 : i;
      const currentWordSize = WORD_SIZE[layers] ?? 0;
      if (wordSize !== currentWordSize) {
        wordSize = currentWordSize;
        stuffedBits = stuffBits(bits, wordSize);
      }
      if (compact && stuffedBits.len() / wordSize > 64) {
        continue;
      }
      totalBitsInLayerVal = totalBitsInLayer(layers, compact);
      const usableBitsInLayers = totalBitsInLayerVal - (totalBitsInLayerVal % wordSize);
      const totalSymbolWords = usableBitsInLayers / wordSize;
      if (totalSymbolWords === 0) continue;

      const requiredDataWords = Math.trunc((stuffedBits.len() + wordSize - 1) / wordSize);
      const eccWordsToReserve = Math.ceil((totalSymbolWords * minECCPercent) / 100) + 3;
      const availableDataWords = totalSymbolWords - eccWordsToReserve;
      if (requiredDataWords <= availableDataWords) {
        break;
      }
    }
  }

  const messageBits = generateCheckWords(stuffedBits, totalBitsInLayerVal, wordSize);
  const messageSizeInWords = Math.trunc(stuffedBits.len() / wordSize);
  const modeMessage = generateModeMessage(compact, layers, messageSizeInWords);

  const baseMatrixSize = compact ? 11 + layers * 4 : 14 + layers * 4;
  const alignmentMap = new Array<number>(baseMatrixSize).fill(0);
  let matrixSize: number;

  if (compact) {
    matrixSize = baseMatrixSize;
    for (let k = 0; k < alignmentMap.length; k++) {
      alignmentMap[k] = k;
    }
  } else {
    // Full-range Aztec inserts an alignment row/col every 16 modules.
    matrixSize = baseMatrixSize + 1 + 2 * Math.trunc((Math.trunc(baseMatrixSize / 2) - 1) / 15);
    const origCenter = Math.trunc(baseMatrixSize / 2);
    const center = Math.trunc(matrixSize / 2);
    for (let k = 0; k < origCenter; k++) {
      const newOffset = k + Math.trunc(k / 15);
      alignmentMap[origCenter - k - 1] = center - newOffset - 1;
      alignmentMap[origCenter + k] = center + newOffset + 1;
    }
  }
  const code = new AztecCode(matrixSize);
  code.content = data;

  // Draw data bits, layer by layer, in the standard Aztec spiral order.
  for (let i = 0, rowOffset = 0; i < layers; i++) {
    let rowSize = (layers - i) * 4;
    rowSize += compact ? 9 : 12;

    for (let j = 0; j < rowSize; j++) {
      const columnOffset = j * 2;
      for (let k = 0; k < 2; k++) {
        const top = alignmentMap[i * 2 + k] ?? 0;
        const colJ = alignmentMap[i * 2 + j] ?? 0;
        const right = alignmentMap[baseMatrixSize - 1 - i * 2 - k] ?? 0;
        const colJOpp = alignmentMap[baseMatrixSize - 1 - i * 2 - j] ?? 0;

        if (messageBits.getBit(rowOffset + columnOffset + k)) {
          code.set(top, colJ);
        }
        if (messageBits.getBit(rowOffset + rowSize * 2 + columnOffset + k)) {
          code.set(colJ, right);
        }
        if (messageBits.getBit(rowOffset + rowSize * 4 + columnOffset + k)) {
          code.set(right, colJOpp);
        }
        if (messageBits.getBit(rowOffset + rowSize * 6 + columnOffset + k)) {
          code.set(colJOpp, top);
        }
      }
    }
    rowOffset += rowSize * 8;
  }

  drawModeMessage(code, compact, matrixSize, modeMessage);

  if (compact) {
    drawBullsEye(code, Math.trunc(matrixSize / 2), 5);
  } else {
    drawBullsEye(code, Math.trunc(matrixSize / 2), 7);
    // Reference grid lines for the alignment patterns.
    for (let i = 0, j = 0; i < Math.trunc(baseMatrixSize / 2) - 1; i += 15, j += 16) {
      const center = Math.trunc(matrixSize / 2);
      for (let k = center & 1; k < matrixSize; k += 2) {
        code.set(center - j, k);
        code.set(center + j, k);
        code.set(k, center - j);
        code.set(k, center + j);
      }
    }
  }
  return code;
}
