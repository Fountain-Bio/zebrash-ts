// Port of internal/barcodes/qrcode/encoder/encoder.go

import type { ErrorCorrectionLevel } from "./error-correction-level.ts";
import type { Options } from "./options.ts";

import { BitArray, GaloisField, ReedSolomonEncoder } from "../../utils/index.ts";
import { BlockPair } from "./block-pair.ts";
import { ByteMatrix } from "./byte-matrix.ts";
import {
  type CharacterSetECI,
  GetCharacterSetECI,
  GetCharacterSetECIByName,
  encodeBytes,
} from "./character-set-eci.ts";
import {
  MaskUtil_applyMaskPenaltyRule1,
  MaskUtil_applyMaskPenaltyRule2,
  MaskUtil_applyMaskPenaltyRule3,
  MaskUtil_applyMaskPenaltyRule4,
} from "./mask-util.ts";
import { MatrixUtil_buildMatrix } from "./matrix-util.ts";
import {
  type Mode,
  Mode_ALPHANUMERIC,
  Mode_BYTE,
  Mode_ECI,
  Mode_FNC1_FIRST_POSITION,
  Mode_KANJI,
  Mode_NUMERIC,
} from "./mode.ts";
import { QRCode, QRCode_IsValidMaskPattern } from "./qrcode.ts";
import { StringUtils_SHIFT_JIS_CHARSET } from "./string-utils.ts";
import { type Version, Version_GetVersionForNumber } from "./version.ts";

export const Encoder_DEFAULT_BYTE_MODE_ENCODING = "UTF-8";

const alphanumericTable: readonly number[] = [
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1, // 0x00-0x0f
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1,
  -1, // 0x10-0x1f
  36,
  -1,
  -1,
  -1,
  37,
  38,
  -1,
  -1,
  -1,
  -1,
  39,
  40,
  -1,
  41,
  42,
  43, // 0x20-0x2f
  0,
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  44,
  -1,
  -1,
  -1,
  -1,
  -1, // 0x30-0x3f
  -1,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  17,
  18,
  19,
  20,
  21,
  22,
  23,
  24, // 0x40-0x4f
  25,
  26,
  27,
  28,
  29,
  30,
  31,
  32,
  33,
  34,
  35,
  -1,
  -1,
  -1,
  -1,
  -1, // 0x50-0x5f
];

function calculateMaskPenalty(matrix: ByteMatrix): number {
  return (
    MaskUtil_applyMaskPenaltyRule1(matrix) +
    MaskUtil_applyMaskPenaltyRule2(matrix) +
    MaskUtil_applyMaskPenaltyRule3(matrix) +
    MaskUtil_applyMaskPenaltyRule4(matrix)
  );
}

export function Encoder_encode(
  content: string,
  ecLevel: ErrorCorrectionLevel,
  opts: Options,
): QRCode {
  // Determine character encoding
  let encoding = Encoder_DEFAULT_BYTE_MODE_ENCODING;
  if (opts.CharacterSetName !== undefined && opts.CharacterSetName !== "") {
    const eci = GetCharacterSetECIByName(opts.CharacterSetName);
    if (eci !== null) {
      encoding = eci.getCharset();
    } else {
      throw new Error("WriterException");
    }
  }

  let mode = opts.Mode ?? null;
  if (mode === null) {
    mode = chooseMode(content, encoding);
  }

  const headerBits = new BitArray();

  if (mode === Mode_BYTE && opts.CharacterSetName !== undefined && opts.CharacterSetName !== "") {
    const eci = GetCharacterSetECI(encoding);
    if (eci !== null) {
      appendECI(eci, headerBits);
    }
  }

  if (opts.AppendGS1 === true) {
    appendModeInfo(Mode_FNC1_FIRST_POSITION, headerBits);
  }

  appendModeInfo(mode, headerBits);

  const dataBits = new BitArray();
  appendBytes(content, mode, dataBits, encoding);

  let version: Version;
  if (opts.VersionNumber !== undefined && opts.VersionNumber > 0) {
    version = Version_GetVersionForNumber(opts.VersionNumber);
    const bitsNeeded = calculateBitsNeeded(mode, headerBits, dataBits, version);
    if (!willFit(bitsNeeded, version, ecLevel)) {
      throw new Error("data too big for requested version");
    }
  } else {
    version = recommendVersion(ecLevel, mode, headerBits, dataBits);
  }

  const headerAndDataBits = new BitArray();
  headerAndDataBits.appendBitArray(headerBits);

  let numLetters = content.length;
  if (mode === Mode_BYTE) {
    numLetters = dataBits.getSizeInBytes();
  } else if (mode === Mode_KANJI) {
    // Count of code points (rune count); for JS, count Unicode scalar values.
    numLetters = countCodePoints(content);
  }

  appendLengthInfo(numLetters, version, mode, headerAndDataBits);
  headerAndDataBits.appendBitArray(dataBits);

  const ecBlocks = version.getECBlocksForLevel(ecLevel);
  if (ecBlocks === null) {
    throw new Error("no EC blocks for level");
  }
  const numDataBytes = version.getTotalCodewords() - ecBlocks.getTotalECCodewords();

  terminateBits(numDataBytes, headerAndDataBits);

  const finalBits = interleaveWithECBytes(
    headerAndDataBits,
    version.getTotalCodewords(),
    numDataBytes,
    ecBlocks.getNumBlocks(),
  );

  const qrCode = new QRCode();
  qrCode.setECLevel(ecLevel);
  qrCode.setMode(mode);
  qrCode.setVersion(version);

  const dimension = version.getDimensionForVersion();
  const matrix = new ByteMatrix(dimension, dimension);

  let maskPattern = -1;
  if (opts.MaskPattern !== undefined && opts.MaskPattern !== null) {
    maskPattern = opts.MaskPattern;
    if (!QRCode_IsValidMaskPattern(maskPattern)) {
      maskPattern = -1;
    }
  }

  if (maskPattern === -1) {
    maskPattern = chooseMaskPattern(finalBits, ecLevel, version, matrix);
  }
  qrCode.setMaskPattern(maskPattern);

  MatrixUtil_buildMatrix(finalBits, ecLevel, version, maskPattern, matrix);
  qrCode.setMatrix(matrix);

  return qrCode;
}

function recommendVersion(
  ecLevel: ErrorCorrectionLevel,
  mode: Mode,
  headerBits: BitArray,
  dataBits: BitArray,
): Version {
  const version1 = Version_GetVersionForNumber(1);
  const provisionalBitsNeeded = calculateBitsNeeded(mode, headerBits, dataBits, version1);
  const provisionalVersion = chooseVersion(provisionalBitsNeeded, ecLevel);

  const bitsNeeded = calculateBitsNeeded(mode, headerBits, dataBits, provisionalVersion);
  return chooseVersion(bitsNeeded, ecLevel);
}

function calculateBitsNeeded(
  mode: Mode,
  headerBits: BitArray,
  dataBits: BitArray,
  version: Version,
): number {
  return headerBits.getSize() + mode.getCharacterCountBits(version) + dataBits.getSize();
}

function getAlphanumericCode(code: number): number {
  if (code < alphanumericTable.length) {
    return alphanumericTable[code] as number;
  }
  return -1;
}

function chooseMode(content: string, encoding: string): Mode {
  if (encoding === StringUtils_SHIFT_JIS_CHARSET && isOnlyDoubleByteKanji(content)) {
    return Mode_KANJI;
  }
  let hasNumeric = false;
  let hasAlphanumeric = false;
  for (let i = 0; i < content.length; i++) {
    const c = content.charCodeAt(i);
    if (c >= 0x30 && c <= 0x39) {
      hasNumeric = true;
    } else if (getAlphanumericCode(c) !== -1) {
      hasAlphanumeric = true;
    } else {
      return Mode_BYTE;
    }
  }
  if (hasAlphanumeric) {
    return Mode_ALPHANUMERIC;
  }
  if (hasNumeric) {
    return Mode_NUMERIC;
  }
  return Mode_BYTE;
}

function isOnlyDoubleByteKanji(content: string): boolean {
  let bytes: Uint8Array;
  try {
    bytes = encodeBytes(content, StringUtils_SHIFT_JIS_CHARSET);
  } catch {
    return false;
  }

  const length = bytes.length;
  if (length % 2 !== 0) {
    return false;
  }
  for (let i = 0; i < length; i += 2) {
    const byte1 = (bytes[i] as number) & 0xff;
    if ((byte1 < 0x81 || byte1 > 0x9f) && (byte1 < 0xe0 || byte1 > 0xeb)) {
      return false;
    }
  }
  return true;
}

function chooseMaskPattern(
  bits: BitArray,
  ecLevel: ErrorCorrectionLevel,
  version: Version,
  matrix: ByteMatrix,
): number {
  let minPenalty = 0x7fffffff;
  let bestMaskPattern = -1;
  for (let maskPattern = 0; maskPattern < 8; maskPattern++) {
    MatrixUtil_buildMatrix(bits, ecLevel, version, maskPattern, matrix);
    const penalty = calculateMaskPenalty(matrix);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMaskPattern = maskPattern;
    }
  }
  return bestMaskPattern;
}

function chooseVersion(numInputBits: number, ecLevel: ErrorCorrectionLevel): Version {
  for (let versionNum = 1; versionNum <= 40; versionNum++) {
    const version = Version_GetVersionForNumber(versionNum);
    if (willFit(numInputBits, version, ecLevel)) {
      return version;
    }
  }
  throw new Error("data too big");
}

function willFit(numInputBits: number, version: Version, ecLevel: ErrorCorrectionLevel): boolean {
  const numBytes = version.getTotalCodewords();
  const ecBlocks = version.getECBlocksForLevel(ecLevel);
  if (ecBlocks === null) {
    return false;
  }
  const numEcBytes = ecBlocks.getTotalECCodewords();
  const numDataBytes = numBytes - numEcBytes;
  const totalInputBytes = Math.floor((numInputBits + 7) / 8);
  return numDataBytes >= totalInputBytes;
}

function terminateBits(numDataBytes: number, bits: BitArray): void {
  const capacity = numDataBytes * 8;
  if (bits.getSize() > capacity) {
    throw new Error(`data bits cannot fit in the QR Code ${bits.getSize()} > ${capacity}`);
  }
  for (let i = 0; i < 4 && bits.getSize() < capacity; i++) {
    bits.appendBit(false);
  }
  const numBitsInLastByte = bits.getSize() & 0x07;
  if (numBitsInLastByte > 0) {
    for (let i = numBitsInLastByte; i < 8; i++) {
      bits.appendBit(false);
    }
  }
  const numPaddingBytes = numDataBytes - bits.getSizeInBytes();
  for (let i = 0; i < numPaddingBytes; i++) {
    const v = (i & 0x1) === 0 ? 0xec : 0x11;
    bits.appendBits(v, 8);
  }
  if (bits.getSize() !== capacity) {
    throw new Error(`bits.GetSize()=${bits.getSize()}, capacity=${capacity}`);
  }
}

function getNumDataBytesAndNumECBytesForBlockID(
  numTotalBytes: number,
  numDataBytes: number,
  numRSBlocks: number,
  blockID: number,
): { numDataBytesInBlock: number; numECBytesInBlock: number } {
  if (blockID >= numRSBlocks) {
    throw new Error("block ID too large");
  }
  const numRsBlocksInGroup2 = numTotalBytes % numRSBlocks;
  const numRsBlocksInGroup1 = numRSBlocks - numRsBlocksInGroup2;
  const numTotalBytesInGroup1 = Math.floor(numTotalBytes / numRSBlocks);
  const numTotalBytesInGroup2 = numTotalBytesInGroup1 + 1;
  const numDataBytesInGroup1 = Math.floor(numDataBytes / numRSBlocks);
  const numDataBytesInGroup2 = numDataBytesInGroup1 + 1;
  const numEcBytesInGroup1 = numTotalBytesInGroup1 - numDataBytesInGroup1;
  const numEcBytesInGroup2 = numTotalBytesInGroup2 - numDataBytesInGroup2;
  if (numEcBytesInGroup1 !== numEcBytesInGroup2) {
    throw new Error("EC bytes mismatch");
  }
  if (numRSBlocks !== numRsBlocksInGroup1 + numRsBlocksInGroup2) {
    throw new Error("RS blocks mismatch");
  }
  if (
    numTotalBytes !==
    (numDataBytesInGroup1 + numEcBytesInGroup1) * numRsBlocksInGroup1 +
      (numDataBytesInGroup2 + numEcBytesInGroup2) * numRsBlocksInGroup2
  ) {
    throw new Error("total bytes mismatch");
  }
  if (blockID < numRsBlocksInGroup1) {
    return { numDataBytesInBlock: numDataBytesInGroup1, numECBytesInBlock: numEcBytesInGroup1 };
  }
  return { numDataBytesInBlock: numDataBytesInGroup2, numECBytesInBlock: numEcBytesInGroup2 };
}

function interleaveWithECBytes(
  bits: BitArray,
  numTotalBytes: number,
  numDataBytes: number,
  numRSBlocks: number,
): BitArray {
  if (bits.getSizeInBytes() !== numDataBytes) {
    throw new Error("number of bits and data bytes does not match");
  }

  let dataBytesOffset = 0;
  let maxNumDataBytes = 0;
  let maxNumEcBytes = 0;
  const blocks: BlockPair[] = [];

  for (let i = 0; i < numRSBlocks; i++) {
    const { numDataBytesInBlock, numECBytesInBlock } = getNumDataBytesAndNumECBytesForBlockID(
      numTotalBytes,
      numDataBytes,
      numRSBlocks,
      i,
    );

    const size = numDataBytesInBlock;
    const dataBytes = new Uint8Array(size);
    bits.toBytes(8 * dataBytesOffset, dataBytes, 0, size);
    const ecBytes = generateECBytes(dataBytes, numECBytesInBlock);
    blocks.push(new BlockPair(dataBytes, ecBytes));

    if (maxNumDataBytes < size) {
      maxNumDataBytes = size;
    }
    if (maxNumEcBytes < ecBytes.length) {
      maxNumEcBytes = ecBytes.length;
    }
    dataBytesOffset += numDataBytesInBlock;
  }
  if (numDataBytes !== dataBytesOffset) {
    throw new Error("data bytes does not match offset");
  }

  const result = new BitArray();

  for (let i = 0; i < maxNumDataBytes; i++) {
    for (const block of blocks) {
      const dataBytes = block.getDataBytes();
      if (i < dataBytes.length) {
        result.appendBits(dataBytes[i] as number, 8);
      }
    }
  }
  for (let i = 0; i < maxNumEcBytes; i++) {
    for (const block of blocks) {
      const ecBytes = block.getErrorCorrectionBytes();
      if (i < ecBytes.length) {
        result.appendBits(ecBytes[i] as number, 8);
      }
    }
  }
  if (numTotalBytes !== result.getSizeInBytes()) {
    throw new Error(`interleaving error: ${numTotalBytes} and ${result.getSizeInBytes()} differ`);
  }

  return result;
}

const rsEncoder = new ReedSolomonEncoder(new GaloisField(0x011d, 256, 0));

function generateECBytes(dataBytes: Uint8Array, numEcBytesInBlock: number): Uint8Array {
  const numDataBytes = dataBytes.length;
  const toEncode: number[] = Array.from({ length: numDataBytes }, () => 0);
  for (let i = 0; i < numDataBytes; i++) {
    toEncode[i] = (dataBytes[i] as number) & 0xff;
  }
  const eccInts = rsEncoder.encode(toEncode, numEcBytesInBlock);
  const ecBytes = new Uint8Array(eccInts.length);
  for (let i = 0; i < eccInts.length; i++) {
    ecBytes[i] = (eccInts[i] as number) & 0xff;
  }
  return ecBytes;
}

function appendModeInfo(mode: Mode, bits: BitArray): void {
  bits.appendBits(mode.getBits(), 4);
}

function appendLengthInfo(numLetters: number, version: Version, mode: Mode, bits: BitArray): void {
  const numBits = mode.getCharacterCountBits(version);
  if (numLetters >= 1 << numBits) {
    throw new Error(`${numLetters} is bigger than ${1 << numBits}`);
  }
  bits.appendBits(numLetters, numBits);
}

function appendBytes(content: string, mode: Mode, bits: BitArray, encoding: string): void {
  if (mode === Mode_NUMERIC) {
    appendNumericBytes(content, bits);
    return;
  }
  if (mode === Mode_ALPHANUMERIC) {
    appendAlphanumericBytes(content, bits);
    return;
  }
  if (mode === Mode_BYTE) {
    append8BitBytes(content, bits, encoding);
    return;
  }
  if (mode === Mode_KANJI) {
    appendKanjiBytes(content, bits);
    return;
  }
  throw new Error(`invalid mode: ${mode.toString()}`);
}

function appendNumericBytes(content: string, bits: BitArray): void {
  const length = content.length;
  let i = 0;
  while (i < length) {
    const num1 = content.charCodeAt(i) - 0x30;
    if (i + 2 < length) {
      const num2 = content.charCodeAt(i + 1) - 0x30;
      const num3 = content.charCodeAt(i + 2) - 0x30;
      bits.appendBits(num1 * 100 + num2 * 10 + num3, 10);
      i += 3;
    } else if (i + 1 < length) {
      const num2 = content.charCodeAt(i + 1) - 0x30;
      bits.appendBits(num1 * 10 + num2, 7);
      i += 2;
    } else {
      bits.appendBits(num1, 4);
      i++;
    }
  }
}

function appendAlphanumericBytes(content: string, bits: BitArray): void {
  const length = content.length;
  let i = 0;
  while (i < length) {
    const code1 = getAlphanumericCode(content.charCodeAt(i));
    if (code1 === -1) {
      throw new Error("appendAlphanumericBytes");
    }
    if (i + 1 < length) {
      const code2 = getAlphanumericCode(content.charCodeAt(i + 1));
      if (code2 === -1) {
        throw new Error("appendAlphanumericBytes");
      }
      bits.appendBits(code1 * 45 + code2, 11);
      i += 2;
    } else {
      bits.appendBits(code1, 6);
      i++;
    }
  }
}

function append8BitBytes(content: string, bits: BitArray, encoding: string): void {
  const bytes = encodeBytes(content, encoding);
  for (const b of bytes) {
    bits.appendBits(b, 8);
  }
}

function appendKanjiBytes(content: string, bits: BitArray): void {
  const bytes = encodeBytes(content, StringUtils_SHIFT_JIS_CHARSET);
  if (bytes.length % 2 !== 0) {
    throw new Error("kanji byte size not even");
  }
  const maxI = bytes.length - 1;
  for (let i = 0; i < maxI; i += 2) {
    const byte1 = (bytes[i] as number) & 0xff;
    const byte2 = (bytes[i + 1] as number) & 0xff;
    const code = (byte1 << 8) | byte2;
    let subtracted = -1;
    if (code >= 0x8140 && code <= 0x9ffc) {
      subtracted = code - 0x8140;
    } else if (code >= 0xe040 && code <= 0xebbf) {
      subtracted = code - 0xc140;
    }
    if (subtracted === -1) {
      throw new Error("invalid byte sequence");
    }
    const encoded = (subtracted >> 8) * 0xc0 + (subtracted & 0xff);
    bits.appendBits(encoded, 13);
  }
}

function appendECI(eci: CharacterSetECI, bits: BitArray): void {
  bits.appendBits(Mode_ECI.getBits(), 4);
  bits.appendBits(eci.getValue(), 8);
}

function countCodePoints(content: string): number {
  let count = 0;
  for (const _ of content) {
    count++;
  }
  return count;
}
