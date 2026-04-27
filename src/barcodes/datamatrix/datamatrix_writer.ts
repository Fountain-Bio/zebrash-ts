import { BitMatrix } from "../utils/index.js";
import { type ByteMatrix, newByteMatrix } from "./encoder/byte_matrix.js";
import { type DefaultPlacement, newDefaultPlacement } from "./encoder/default_placement.js";
import { errorCorrection_encodeECC200 } from "./encoder/error_correction.js";
import { encodeHighLevel } from "./encoder/high_level_encoder.js";
import type { Options } from "./encoder/options.js";
import { type SymbolInfo, symbolInfoLookup } from "./encoder/symbol_info.js";

export function encode(contents: string, width: number, height: number, opts: Options): BitMatrix {
  if (contents === "") {
    throw new Error("found empty contents");
  }

  // 1. step: Data encodation
  const encoded = encodeHighLevel(contents, opts);

  const symbolInfo = symbolInfoLookup(encoded.length, opts, true);
  if (symbolInfo === null) {
    throw new Error("symbol info lookup failed");
  }

  // 2. step: ECC generation
  const codewords = errorCorrection_encodeECC200(encoded, symbolInfo);

  // 3. step: Module placement in Matrix
  const placement = newDefaultPlacement(
    codewords,
    symbolInfo.getSymbolDataWidth(),
    symbolInfo.getSymbolDataHeight(),
  );
  placement.place();

  // 4. step: low-level encoding
  return encodeLowLevel(placement, symbolInfo, width, height);
}

// encodeLowLevel encodes the given symbol info to a bit matrix.
function encodeLowLevel(
  placement: DefaultPlacement,
  symbolInfo: SymbolInfo,
  width: number,
  height: number,
): BitMatrix {
  const symbolWidth = symbolInfo.getSymbolDataWidth();
  const symbolHeight = symbolInfo.getSymbolDataHeight();

  const matrix = newByteMatrix(symbolInfo.getSymbolWidth(), symbolInfo.getSymbolHeight());

  let matrixY = 0;

  for (let y = 0; y < symbolHeight; y++) {
    // Fill the top edge with alternate 0 / 1
    let matrixX: number;
    if (y % symbolInfo.getMatrixHeight() === 0) {
      matrixX = 0;
      for (let x = 0; x < symbolInfo.getSymbolWidth(); x++) {
        matrix.setBool(matrixX, matrixY, x % 2 === 0);
        matrixX++;
      }
      matrixY++;
    }
    matrixX = 0;
    for (let x = 0; x < symbolWidth; x++) {
      // Fill the right edge with full 1
      if (x % symbolInfo.getMatrixWidth() === 0) {
        matrix.setBool(matrixX, matrixY, true);
        matrixX++;
      }
      matrix.setBool(matrixX, matrixY, placement.getBit(x, y));
      matrixX++;
      // Fill the right edge with alternate 0 / 1
      if (x % symbolInfo.getMatrixWidth() === symbolInfo.getMatrixWidth() - 1) {
        matrix.setBool(matrixX, matrixY, y % 2 === 0);
        matrixX++;
      }
    }
    matrixY++;
    // Fill the bottom edge with full 1
    if (y % symbolInfo.getMatrixHeight() === symbolInfo.getMatrixHeight() - 1) {
      matrixX = 0;
      for (let x = 0; x < symbolInfo.getSymbolWidth(); x++) {
        matrix.setBool(matrixX, matrixY, true);
        matrixX++;
      }
      matrixY++;
    }
  }

  return convertByteMatrixToBitMatrix(matrix, width, height);
}

// convertByteMatrixToBitMatrix converts the ByteMatrix to BitMatrix.
function convertByteMatrixToBitMatrix(
  matrix: ByteMatrix,
  reqWidth: number,
  reqHeight: number,
): BitMatrix {
  const matrixWidth = matrix.getWidth();
  const matrixHeight = matrix.getHeight();
  let outputWidth = reqWidth;
  if (outputWidth < matrixWidth) {
    outputWidth = matrixWidth;
  }
  let outputHeight = reqHeight;
  if (outputHeight < matrixHeight) {
    outputHeight = matrixHeight;
  }

  let multiple = Math.floor(outputWidth / matrixWidth);
  const mh = Math.floor(outputHeight / matrixHeight);
  if (mh < multiple) {
    multiple = mh;
  }

  let leftPadding = Math.floor((outputWidth - matrixWidth * multiple) / 2);
  let topPadding = Math.floor((outputHeight - matrixHeight * multiple) / 2);

  let output: BitMatrix;

  // remove padding if requested width and height are too small
  if (reqHeight < matrixHeight || reqWidth < matrixWidth) {
    leftPadding = 0;
    topPadding = 0;
    output = new BitMatrix(matrixWidth, matrixHeight);
  } else {
    output = new BitMatrix(reqWidth, reqHeight);
  }

  output.clear();
  for (let inputY = 0, outputY = topPadding; inputY < matrixHeight; inputY++, outputY += multiple) {
    // Write the contents of this row of the bytematrix
    for (
      let inputX = 0, outputX = leftPadding;
      inputX < matrixWidth;
      inputX++, outputX += multiple
    ) {
      if (matrix.get(inputX, inputY) === 1) {
        output.setRegion(outputX, outputY, multiple, multiple);
      }
    }
  }

  return output;
}
