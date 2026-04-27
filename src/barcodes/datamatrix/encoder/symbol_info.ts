import { newDataMatrixSymbolInfo144 } from "./datamatrix_symbol_info_144.js";
import type { Options } from "./options.js";
import { SymbolShapeHint } from "./symbol_shape_hint.js";

// Symbol info table for DataMatrix.
export class SymbolInfo {
  readonly rectangular: boolean;
  readonly dataCapacity: number;
  readonly errorCodewords: number;
  readonly matrixWidth: number;
  readonly matrixHeight: number;
  readonly dataRegions: number;
  readonly rsBlockData: number;
  readonly rsBlockError: number;

  funcGetInterleavedBlockCount: (si: SymbolInfo) => number;
  funcGetDataLengthForInterleavedBlock: (si: SymbolInfo, index: number) => number;

  constructor(
    rectangular: boolean,
    dataCapacity: number,
    errorCodewords: number,
    matrixWidth: number,
    matrixHeight: number,
    dataRegions: number,
    rsBlockData: number,
    rsBlockError: number,
  ) {
    this.rectangular = rectangular;
    this.dataCapacity = dataCapacity;
    this.errorCodewords = errorCodewords;
    this.matrixWidth = matrixWidth;
    this.matrixHeight = matrixHeight;
    this.dataRegions = dataRegions;
    this.rsBlockData = rsBlockData;
    this.rsBlockError = rsBlockError;
    this.funcGetInterleavedBlockCount = defaultGetInterleavedBlockCount;
    this.funcGetDataLengthForInterleavedBlock = defaultGetDataLengthForInterleavedBlock;
  }

  private getHorizontalDataRegions(): number {
    switch (this.dataRegions) {
      case 1:
        return 1;
      case 2:
      case 4:
        return 2;
      case 16:
        return 4;
      case 36:
        return 6;
      default:
        return 0;
    }
  }

  private getVerticalDataRegions(): number {
    switch (this.dataRegions) {
      case 1:
      case 2:
        return 1;
      case 4:
        return 2;
      case 16:
        return 4;
      case 36:
        return 6;
      default:
        return 0;
    }
  }

  getSymbolDataWidth(): number {
    return this.getHorizontalDataRegions() * this.matrixWidth;
  }

  getSymbolDataHeight(): number {
    return this.getVerticalDataRegions() * this.matrixHeight;
  }

  getSymbolWidth(): number {
    return this.getSymbolDataWidth() + this.getHorizontalDataRegions() * 2;
  }

  getSymbolHeight(): number {
    return this.getSymbolDataHeight() + this.getVerticalDataRegions() * 2;
  }

  getCodewordCount(): number {
    return this.dataCapacity + this.errorCodewords;
  }

  getInterleavedBlockCount(): number {
    return this.funcGetInterleavedBlockCount(this);
  }

  getDataCapacity(): number {
    return this.dataCapacity;
  }

  getErrorCodewords(): number {
    return this.errorCodewords;
  }

  getMatrixWidth(): number {
    return this.matrixWidth;
  }

  getMatrixHeight(): number {
    return this.matrixHeight;
  }

  getDataLengthForInterleavedBlock(index: number): number {
    return this.funcGetDataLengthForInterleavedBlock(this, index);
  }

  getErrorLengthForInterleavedBlock(_index: number): number {
    return this.rsBlockError;
  }

  toString(): string {
    const shape = this.rectangular ? "Rectangular" : "Square";
    return (
      `${shape} Symbpl: data region ${this.matrixWidth}x${this.matrixHeight}, ` +
      `symbol size ${this.getSymbolWidth()}x${this.getSymbolHeight()}, ` +
      `symbol data size ${this.getSymbolDataWidth()}x${this.getSymbolDataHeight()}, ` +
      `codewords ${this.dataCapacity}+${this.errorCodewords}`
    );
  }
}

function defaultGetInterleavedBlockCount(si: SymbolInfo): number {
  return Math.floor(si.dataCapacity / si.rsBlockData);
}

function defaultGetDataLengthForInterleavedBlock(si: SymbolInfo, _index: number): number {
  return si.rsBlockData;
}

export function newSymbolInfo(
  rectangular: boolean,
  dataCapacity: number,
  errorCodewords: number,
  matrixWidth: number,
  matrixHeight: number,
  dataRegions: number,
): SymbolInfo {
  return new SymbolInfo(
    rectangular,
    dataCapacity,
    errorCodewords,
    matrixWidth,
    matrixHeight,
    dataRegions,
    dataCapacity,
    errorCodewords,
  );
}

export function newSymbolInfoRS(
  rectangular: boolean,
  dataCapacity: number,
  errorCodewords: number,
  matrixWidth: number,
  matrixHeight: number,
  dataRegions: number,
  rsBlockData: number,
  rsBlockError: number,
): SymbolInfo {
  return new SymbolInfo(
    rectangular,
    dataCapacity,
    errorCodewords,
    matrixWidth,
    matrixHeight,
    dataRegions,
    rsBlockData,
    rsBlockError,
  );
}

let symbolsCache: SymbolInfo[] | null = null;

function getSymbols(): SymbolInfo[] {
  if (symbolsCache !== null) {
    return symbolsCache;
  }
  symbolsCache = [
    newSymbolInfo(false, 3, 5, 8, 8, 1),
    newSymbolInfo(false, 5, 7, 10, 10, 1),
    /* rect */ newSymbolInfo(true, 5, 7, 16, 6, 1),
    newSymbolInfo(false, 8, 10, 12, 12, 1),
    /* rect */ newSymbolInfo(true, 10, 11, 14, 6, 2),
    newSymbolInfo(false, 12, 12, 14, 14, 1),
    /* rect */ newSymbolInfo(true, 16, 14, 24, 10, 1),

    newSymbolInfo(false, 18, 14, 16, 16, 1),
    newSymbolInfo(false, 22, 18, 18, 18, 1),
    /* rect */ newSymbolInfo(true, 22, 18, 16, 10, 2),
    newSymbolInfo(false, 30, 20, 20, 20, 1),
    /* rect */ newSymbolInfo(true, 32, 24, 16, 14, 2),
    newSymbolInfo(false, 36, 24, 22, 22, 1),
    newSymbolInfo(false, 44, 28, 24, 24, 1),
    /* rect */ newSymbolInfo(true, 49, 28, 22, 14, 2),

    newSymbolInfo(false, 62, 36, 14, 14, 4),
    newSymbolInfo(false, 86, 42, 16, 16, 4),
    newSymbolInfo(false, 114, 48, 18, 18, 4),
    newSymbolInfo(false, 144, 56, 20, 20, 4),
    newSymbolInfo(false, 174, 68, 22, 22, 4),

    newSymbolInfoRS(false, 204, 84, 24, 24, 4, 102, 42),
    newSymbolInfoRS(false, 280, 112, 14, 14, 16, 140, 56),
    newSymbolInfoRS(false, 368, 144, 16, 16, 16, 92, 36),
    newSymbolInfoRS(false, 456, 192, 18, 18, 16, 114, 48),
    newSymbolInfoRS(false, 576, 224, 20, 20, 16, 144, 56),
    newSymbolInfoRS(false, 696, 272, 22, 22, 16, 174, 68),
    newSymbolInfoRS(false, 816, 336, 24, 24, 16, 136, 56),
    newSymbolInfoRS(false, 1050, 408, 18, 18, 36, 175, 68),
    newSymbolInfoRS(false, 1304, 496, 20, 20, 36, 163, 62),
    newDataMatrixSymbolInfo144(),
  ];
  return symbolsCache;
}

export function symbolInfoLookup(
  dataCodewords: number,
  opts: Options,
  fail: boolean,
): SymbolInfo | null {
  for (const symbol of getSymbols()) {
    if (opts.shape === SymbolShapeHint.FORCE_SQUARE && symbol.rectangular) {
      continue;
    }
    if (opts.shape === SymbolShapeHint.FORCE_RECTANGLE && !symbol.rectangular) {
      continue;
    }
    if (
      opts.minSize &&
      (symbol.getSymbolWidth() < opts.minSize.getWidth() ||
        symbol.getSymbolHeight() < opts.minSize.getHeight())
    ) {
      continue;
    }
    if (
      opts.maxSize &&
      (symbol.getSymbolWidth() > opts.maxSize.getWidth() ||
        symbol.getSymbolHeight() > opts.maxSize.getHeight())
    ) {
      continue;
    }
    if (dataCodewords <= symbol.dataCapacity) {
      return symbol;
    }
  }
  if (fail) {
    throw new Error(
      `can't find a symbol arrangement that matches the message. Data codewords: ${dataCodewords}`,
    );
  }
  return null;
}
