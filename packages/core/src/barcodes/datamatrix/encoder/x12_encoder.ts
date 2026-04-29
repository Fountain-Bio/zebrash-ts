import type { Encoder } from "./encoder.js";
import type { EncoderContext } from "./encoder_context.js";

import { c40WriteNextTriplet } from "./c40_encoder.js";
import {
  HighLevelEncoder_ASCII_ENCODATION,
  HighLevelEncoder_X12_ENCODATION,
  HighLevelEncoder_X12_UNLATCH,
  highLevelEncoder_lookAheadTest,
} from "./high_level_encoder.js";

class X12Encoder implements Encoder {
  getEncodingMode(): number {
    return HighLevelEncoder_X12_ENCODATION;
  }

  encode(context: EncoderContext): void {
    // step C
    let buffer: number[] = [];
    while (context.hasMoreCharacters()) {
      const c = context.getCurrentChar();
      context.pos++;

      buffer = x12EncodeChar(c, buffer);

      const count = buffer.length;
      if (count % 3 === 0) {
        buffer = c40WriteNextTriplet(context, buffer);

        const newMode = highLevelEncoder_lookAheadTest(
          context.getMessage(),
          context.pos,
          this.getEncodingMode(),
        );
        if (newMode !== this.getEncodingMode()) {
          // Return to ASCII encodation, which will actually handle latch to new mode
          context.signalEncoderChange(HighLevelEncoder_ASCII_ENCODATION);
          break;
        }
      }
    }
    x12HandleEOD(context, buffer);
  }
}

export function newX12Encoder(): Encoder {
  return new X12Encoder();
}

function x12EncodeChar(c: number, sb: number[]): number[] {
  switch (c) {
    case 0x0d /* '\r' */:
      sb.push(0);
      return sb;
    case 0x2a /* '*' */:
      sb.push(1);
      return sb;
    case 0x3e /* '>' */:
      sb.push(2);
      return sb;
    case 0x20 /* ' ' */:
      sb.push(3);
      return sb;
    default:
      if (c >= 0x30 /* '0' */ && c <= 0x39 /* '9' */) {
        sb.push(c - 48 + 4);
        return sb;
      }
      if (c >= 0x41 /* 'A' */ && c <= 0x5a /* 'Z' */) {
        sb.push(c - 65 + 14);
        return sb;
      }
      throw new Error(`illegal character: ${c} (0x${c.toString(16).padStart(4, "0")})`);
  }
}

function x12HandleEOD(context: EncoderContext, buffer: number[]): void {
  context.updateSymbolInfo();
  const available = context.getSymbolInfo().getDataCapacity() - context.getCodewordCount();
  const count = buffer.length;
  context.pos -= count;
  if (
    context.getRemainingCharacters() > 1 ||
    available > 1 ||
    context.getRemainingCharacters() !== available
  ) {
    context.writeCodeword(HighLevelEncoder_X12_UNLATCH);
  }
  if (context.getNewEncoding() < 0) {
    context.signalEncoderChange(HighLevelEncoder_ASCII_ENCODATION);
  }
}
