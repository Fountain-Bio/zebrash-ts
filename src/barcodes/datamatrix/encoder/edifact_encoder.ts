import type { Encoder } from "./encoder.js";
import type { EncoderContext } from "./encoder_context.js";
import {
  HighLevelEncoder_ASCII_ENCODATION,
  HighLevelEncoder_EDIFACT_ENCODATION,
  highLevelEncoder_lookAheadTest,
} from "./high_level_encoder.js";

class EdifactEncoder implements Encoder {
  getEncodingMode(): number {
    return HighLevelEncoder_EDIFACT_ENCODATION;
  }

  encode(context: EncoderContext): void {
    // step F
    let buffer: number[] = [];
    while (context.hasMoreCharacters()) {
      const c = context.getCurrentChar();
      buffer = edifactEncodeChar(c, buffer);
      context.pos++;

      const count = buffer.length;
      if (count >= 4) {
        const codewords = edifactEncodeToCodewords(buffer);
        context.writeCodewords(codewords);
        buffer = buffer.slice(4);

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
    buffer.push(31); // Unlatch
    edifactHandleEOD(context, buffer);
  }
}

export function newEdifactEncoder(): Encoder {
  return new EdifactEncoder();
}

// edifactHandleEOD handles "end of data" situations.
function edifactHandleEOD(context: EncoderContext, buffer: number[]): void {
  try {
    const count = buffer.length;
    if (count === 0) {
      return; // Already finished
    }
    if (count === 1) {
      // Only an unlatch at the end
      context.updateSymbolInfo();

      let available = context.getSymbolInfo().getDataCapacity() - context.getCodewordCount();
      const remaining = context.getRemainingCharacters();
      // The following lines are a hack inspired by the 'fix' from
      // https://sourceforge.net/p/barcode4j/svn/221/
      if (remaining > available) {
        context.updateSymbolInfoByLength(context.getCodewordCount() + 1);
        available = context.getSymbolInfo().getDataCapacity() - context.getCodewordCount();
      }
      if (remaining <= available && available <= 2) {
        return; // No unlatch
      }
    }

    if (count > 4) {
      throw new Error(`count must not exceed 4, ${count}`);
    }
    const restChars = count - 1;
    const encoded = edifactEncodeToCodewords(buffer);
    const endOfSymbolReached = !context.hasMoreCharacters();
    let restInAscii = endOfSymbolReached && restChars <= 2;

    if (restChars <= 2) {
      context.updateSymbolInfoByLength(context.getCodewordCount() + restChars);
      const available = context.getSymbolInfo().getDataCapacity() - context.getCodewordCount();
      if (available >= 3) {
        restInAscii = false;
        context.updateSymbolInfoByLength(context.getCodewordCount() + encoded.length);
      }
    }

    if (restInAscii) {
      context.resetSymbolInfo();
      context.pos -= restChars;
    } else {
      context.writeCodewords(encoded);
    }
  } finally {
    context.signalEncoderChange(HighLevelEncoder_ASCII_ENCODATION);
  }
}

function edifactEncodeChar(c: number, sb: number[]): number[] {
  if (c >= 0x20 /* ' ' */ && c <= 0x3f /* '?' */) {
    sb.push(c);
  } else if (c >= 0x40 /* '@' */ && c <= 0x5e /* '^' */) {
    sb.push(c - 64);
  } else {
    throw new Error(`illegal character: ${c} (0x${c.toString(16).padStart(4, "0")})`);
  }
  return sb;
}

function edifactEncodeToCodewords(sb: number[]): number[] {
  const len = sb.length;
  if (len === 0) {
    throw new Error("StringBuilder must not be empty");
  }
  const c1 = sb[0]!;
  const c2 = len >= 2 ? sb[1]! : 0;
  const c3 = len >= 3 ? sb[2]! : 0;
  const c4 = len >= 4 ? sb[3]! : 0;

  const v = (c1 << 18) + (c2 << 12) + (c3 << 6) + c4;
  const cw1 = (v >> 16) & 255;
  const cw2 = (v >> 8) & 255;
  const cw3 = v & 255;
  const res: number[] = [cw1];
  if (len >= 2) {
    res.push(cw2);
  }
  if (len >= 3) {
    res.push(cw3);
  }
  return res;
}
