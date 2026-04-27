import type { Encoder } from "./encoder.js";
import type { EncoderContext } from "./encoder_context.js";
import {
  HighLevelEncoder_ASCII_ENCODATION,
  HighLevelEncoder_BASE256_ENCODATION,
  HighLevelEncoder_C40_ENCODATION,
  HighLevelEncoder_EDIFACT_ENCODATION,
  HighLevelEncoder_LATCH_TO_ANSIX12,
  HighLevelEncoder_LATCH_TO_BASE256,
  HighLevelEncoder_LATCH_TO_C40,
  HighLevelEncoder_LATCH_TO_EDIFACT,
  HighLevelEncoder_LATCH_TO_TEXT,
  HighLevelEncoder_TEXT_ENCODATION,
  HighLevelEncoder_UPPER_SHIFT,
  HighLevelEncoder_X12_ENCODATION,
  highLevelEncoder_determineConsecutiveDigitCount,
  highLevelEncoder_isDigit,
  highLevelEncoder_isExtendedASCII,
  highLevelEncoder_lookAheadTest,
} from "./high_level_encoder.js";

class ASCIIEncoder implements Encoder {
  getEncodingMode(): number {
    return HighLevelEncoder_ASCII_ENCODATION;
  }

  encode(context: EncoderContext): void {
    // step B
    const n = highLevelEncoder_determineConsecutiveDigitCount(context.getMessage(), context.pos);
    if (n >= 2) {
      const digits = encodeASCIIDigits(
        context.getMessage()[context.pos]!,
        context.getMessage()[context.pos + 1]!,
      );
      context.writeCodeword(digits);
      context.pos += 2;
    } else {
      const c = context.getCurrentChar();
      const newMode = highLevelEncoder_lookAheadTest(
        context.getMessage(),
        context.pos,
        this.getEncodingMode(),
      );
      if (newMode !== this.getEncodingMode()) {
        switch (newMode) {
          case HighLevelEncoder_BASE256_ENCODATION:
            context.writeCodeword(HighLevelEncoder_LATCH_TO_BASE256);
            context.signalEncoderChange(HighLevelEncoder_BASE256_ENCODATION);
            return;
          case HighLevelEncoder_C40_ENCODATION:
            context.writeCodeword(HighLevelEncoder_LATCH_TO_C40);
            context.signalEncoderChange(HighLevelEncoder_C40_ENCODATION);
            return;
          case HighLevelEncoder_X12_ENCODATION:
            context.writeCodeword(HighLevelEncoder_LATCH_TO_ANSIX12);
            context.signalEncoderChange(HighLevelEncoder_X12_ENCODATION);
            break;
          case HighLevelEncoder_TEXT_ENCODATION:
            context.writeCodeword(HighLevelEncoder_LATCH_TO_TEXT);
            context.signalEncoderChange(HighLevelEncoder_TEXT_ENCODATION);
            break;
          case HighLevelEncoder_EDIFACT_ENCODATION:
            context.writeCodeword(HighLevelEncoder_LATCH_TO_EDIFACT);
            context.signalEncoderChange(HighLevelEncoder_EDIFACT_ENCODATION);
            break;
          default:
            throw new Error(`illegal mode: ${newMode}`);
        }
      } else if (highLevelEncoder_isExtendedASCII(c)) {
        context.writeCodeword(HighLevelEncoder_UPPER_SHIFT);
        context.writeCodeword((c - 128 + 1) & 0xff);
        context.pos++;
      } else {
        context.writeCodeword((c + 1) & 0xff);
        context.pos++;
      }
    }
  }
}

export function newASCIIEncoder(): Encoder {
  return new ASCIIEncoder();
}

export function encodeASCIIDigits(digit1: number, digit2: number): number {
  if (highLevelEncoder_isDigit(digit1) && highLevelEncoder_isDigit(digit2)) {
    const num = (digit1 - 48) * 10 + (digit2 - 48);
    return (num + 130) & 0xff;
  }
  throw new Error(`not digits: ${String.fromCharCode(digit1)}${String.fromCharCode(digit2)}`);
}
