// Ported from internal/barcodes/pdf417/dimensions.go.

export const minCols = 2;
export const maxCols = 30;
export const maxRows = 30;
export const minRows = 2;

function calculateNumberOfRows(m: number, k: number, c: number): number {
  let r = Math.floor((m + 1 + k) / c) + 1;
  if (c * r >= m + 1 + k + c) {
    r--;
  }
  return r;
}

export interface Dimensions {
  cols: number;
  rows: number;
}

export function calcDimensions(
  targetColumns: number,
  dataWords: number,
  eccWords: number,
): Dimensions {
  let cols = 0;
  let rows = 0;

  for (let c = Math.max(minCols, targetColumns); c <= maxCols; c++) {
    const r = calculateNumberOfRows(dataWords, eccWords, c);

    if (r < minRows) {
      break;
    }

    if (r > maxRows) {
      continue;
    }

    cols = c;
    rows = r;

    break;
  }

  if (rows === 0) {
    const r = calculateNumberOfRows(dataWords, eccWords, minCols);
    if (r < minRows) {
      rows = minRows;
      cols = minCols;
    }
  }

  return { cols, rows };
}
