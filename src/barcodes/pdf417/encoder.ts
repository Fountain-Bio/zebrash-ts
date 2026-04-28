// Ported from internal/barcodes/pdf417/encoder.go.
// Top-level PDF417 encoder. Returns the codewords, grid, and a BitList describing
// the rendered barcode rows. Image rendering/scaling is left to the higher-level
// images unit, mirroring how Go composes pdfBarcode + images.NewScaled.

import { BitList } from "../utils/index.js";
import { START_WORD, STOP_WORD, getCodeword } from "./codewords.js";
import { calcDimensions, maxCols, maxRows, minCols, minRows } from "./dimensions.js";
import {
  type SecurityLevel,
  computeErrorCorrection,
  errorCorrectionWordCount,
} from "./errorcorrection.js";
import { highlevelEncode } from "./highlevel.js";

const PADDING_CODEWORD = 900;

export interface PDF417Result {
  // Final list of data + EC codewords arranged into rows of length `columns`.
  codeWords: number[];
  // codeWords reshaped into a 2D grid of size rows x columns (last row may be short).
  grid: number[][];
  // Bit-by-bit rendering of the barcode (rows packed sequentially, MSB-first).
  code: BitList;
  // Number of columns (data columns). The rendered width = (columns + 4) * 17 + 1.
  columns: number;
  // Number of rows.
  rows: number;
  // Pixel width of the barcode (1 module = 1 pixel).
  width: number;
  // Pixel height of the barcode (1 module = 1 pixel).
  height: number;
}

// Encodes the given data as a PDF417 barcode.
// `securityLevel` should be between 0 and 8. Higher levels add more error correction codewords.
// `targetColumns` constrains the minimum column count (>= 2). Pass 0 to let the encoder pick.
export function encode(data: string, securityLevel: number, targetColumns = 0): PDF417Result {
  if (securityLevel >= 9 || securityLevel < 0) {
    throw new Error(`invalid security level ${securityLevel}`);
  }

  const sl: SecurityLevel = securityLevel;

  const dataWords = highlevelEncode(data);
  const ecCount = errorCorrectionWordCount(sl);

  const { cols: columns, rows } = calcDimensions(targetColumns, dataWords.length, ecCount);
  if (columns < minCols || columns > maxCols || rows < minRows || rows > maxRows) {
    throw new Error("unable to fit data in barcode");
  }

  const codeWords = encodeData(dataWords, columns, sl);

  const grid: number[][] = [];
  for (let i = 0; i < codeWords.length; i += columns) {
    grid.push(codeWords.slice(i, Math.min(i + columns, codeWords.length)));
  }

  const codes: number[][] = [];
  for (let rowNum = 0; rowNum < grid.length; rowNum++) {
    const row = grid[rowNum] ?? [];
    const table = rowNum % 3;
    const rowCodes: number[] = [];

    rowCodes.push(START_WORD);
    rowCodes.push(getCodeword(table, getLeftCodeWord(rowNum, rows, columns, securityLevel)));

    for (const word of row) {
      rowCodes.push(getCodeword(table, word));
    }

    rowCodes.push(getCodeword(table, getRightCodeWord(rowNum, rows, columns, securityLevel)));
    rowCodes.push(STOP_WORD);

    codes.push(rowCodes);
  }

  const code = renderBarcode(codes);
  const width = (columns + 4) * 17 + 1;
  const height = code.len() / width;

  return { codeWords, grid, code, columns, rows, width, height };
}

function encodeData(dataWords: number[], columns: number, sl: SecurityLevel): number[] {
  const dataCount = dataWords.length;
  const ecCount = errorCorrectionWordCount(sl);

  const padWords = getPadding(dataCount, ecCount, columns);
  let padded = [...dataWords, ...padWords];

  const length = padded.length + 1;
  padded = [length, ...padded];

  const ecWords = computeErrorCorrection(sl, padded);

  return [...padded, ...ecWords];
}

function getLeftCodeWord(
  rowNum: number,
  rows: number,
  columns: number,
  securityLevel: number,
): number {
  const tableId = rowNum % 3;
  let x = 0;
  switch (tableId) {
    case 0:
      x = Math.floor((rows - 1) / 3);
      break;
    case 1:
      x = securityLevel * 3;
      x += (rows - 1) % 3;
      break;
    case 2:
      x = columns - 1;
      break;
  }
  return 30 * Math.floor(rowNum / 3) + x;
}

function getRightCodeWord(
  rowNum: number,
  rows: number,
  columns: number,
  securityLevel: number,
): number {
  const tableId = rowNum % 3;
  let x = 0;
  switch (tableId) {
    case 0:
      x = columns - 1;
      break;
    case 1:
      x = Math.floor((rows - 1) / 3);
      break;
    case 2:
      x = securityLevel * 3;
      x += (rows - 1) % 3;
      break;
  }
  return 30 * Math.floor(rowNum / 3) + x;
}

function getPadding(dataCount: number, ecCount: number, columns: number): number[] {
  const totalCount = dataCount + ecCount + 1;
  const mod = totalCount % columns;
  if (mod > 0) {
    const padCount = columns - mod;
    return Array.from({ length: padCount }, (): number => PADDING_CODEWORD);
  }
  return [];
}

function renderBarcode(codes: number[][]): BitList {
  const bl = new BitList();
  for (const row of codes) {
    const lastIdx = row.length - 1;
    for (let i = 0; i < row.length; i++) {
      const col = row[i] ?? 0;
      if (i === lastIdx) {
        bl.addBits(col, 18);
      } else {
        bl.addBits(col, 17);
      }
    }
  }
  return bl;
}

// Build a 2D row-major matrix of booleans from the encoded BitList.
// `width` matches encode()'s pixel width and `height` the row count (one module = one pixel).
export function toMatrix(result: PDF417Result): boolean[][] {
  const { code, width, height } = result;
  const matrix: boolean[][] = [];
  for (let y = 0; y < height; y++) {
    const row: boolean[] = Array.from({ length: width }, () => false);
    for (let x = 0; x < width; x++) {
      row[x] = code.getBit(y * width + x);
    }
    matrix.push(row);
  }
  return matrix;
}
