// Port of internal/barcodes/qrcode/qrcode_writer.go

import { BitMatrix } from "../utils/bit_matrix.ts";
import { Encoder_encode } from "./encoder/encoder.ts";
import type { ErrorCorrectionLevel } from "./encoder/error-correction-level.ts";
import type { Options } from "./encoder/options.ts";
import type { QRCode } from "./encoder/qrcode.ts";

export function Encode(
  contents: string,
  width: number,
  height: number,
  errorCorrectionLevel: ErrorCorrectionLevel,
  opts: Options,
): BitMatrix {
  const code = Encoder_encode(contents, errorCorrectionLevel, opts);
  return renderResult(code, width, height, opts);
}

// Note that the input matrix uses 0 == white, 1 == black, while the output
// matrix uses transparent and black rgb colors (here just an on/off bit).
function renderResult(code: QRCode, width: number, height: number, opts: Options): BitMatrix {
  const input = code.getMatrix();
  if (input === null) {
    throw new Error("IllegalStateException");
  }

  const quietZone = opts.QuietZone ?? 0;
  const inputWidth = input.getWidth();
  const inputHeight = input.getHeight();
  const qrWidth = inputWidth + quietZone * 2;
  const qrHeight = inputHeight + quietZone * 2;
  let outputWidth = qrWidth;
  if (outputWidth < width) {
    outputWidth = width;
  }
  let outputHeight = qrHeight;
  if (outputHeight < height) {
    outputHeight = height;
  }

  let multiple = Math.floor(outputWidth / qrWidth);
  const h = Math.floor(outputHeight / qrHeight);
  if (multiple > h) {
    multiple = h;
  }
  const leftPadding = Math.floor((outputWidth - inputWidth * multiple) / 2);
  const topPadding = Math.floor((outputHeight - inputHeight * multiple) / 2);

  const output = new BitMatrix(outputWidth, outputHeight);

  for (let inputY = 0, outputY = topPadding; inputY < inputHeight; inputY++, outputY += multiple) {
    for (
      let inputX = 0, outputX = leftPadding;
      inputX < inputWidth;
      inputX++, outputX += multiple
    ) {
      if (input.get(inputX, inputY) === 1) {
        output.setRegion(outputX, outputY, multiple, multiple);
      }
    }
  }

  return output;
}
