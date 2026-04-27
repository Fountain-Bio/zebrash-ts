import { type SymbolInfo, newSymbolInfoRS } from "./symbol_info.js";

export function newDataMatrixSymbolInfo144(): SymbolInfo {
  const si = newSymbolInfoRS(false, 1558, 620, 22, 22, 36, -1, 62);
  si.funcGetInterleavedBlockCount = datamatrixSymbolInfo144GetInterleavedBlockCount;
  si.funcGetDataLengthForInterleavedBlock = datamatrixSymbolInfo144GetDataLengthForInterleavedBlock;
  return si;
}

function datamatrixSymbolInfo144GetInterleavedBlockCount(_si: SymbolInfo): number {
  return 10;
}

function datamatrixSymbolInfo144GetDataLengthForInterleavedBlock(
  _si: SymbolInfo,
  index: number,
): number {
  if (index <= 8) {
    return 156;
  }
  return 155;
}
