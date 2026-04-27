import type { Encoder } from "./encoder.js";
import type { EncoderContext } from "./encoder_context.js";
import {
  HighLevelEncoder_ASCII_ENCODATION,
  HighLevelEncoder_BASE256_ENCODATION,
  highLevelEncoder_lookAheadTest,
} from "./high_level_encoder.js";

class Base256Encoder implements Encoder {
  getEncodingMode(): number {
    return HighLevelEncoder_BASE256_ENCODATION;
  }

  encode(context: EncoderContext): void {
    let buffer: number[] = [0, 0]; // Initialize length field
    while (context.hasMoreCharacters()) {
      const c = context.getCurrentChar();
      buffer.push(c);

      context.pos++;

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
    const dataCount = buffer.length - 2;
    const lengthFieldSize = 1;
    const currentSize = context.getCodewordCount() + dataCount + lengthFieldSize;
    context.updateSymbolInfoByLength(currentSize);

    const mustPad = context.getSymbolInfo().getDataCapacity() - currentSize > 0;
    if (context.hasMoreCharacters() || mustPad) {
      if (dataCount <= 249) {
        buffer = buffer.slice(1);
        buffer[0] = dataCount & 0xff;
      } else if (dataCount <= 1555) {
        buffer[0] = (Math.floor(dataCount / 250) + 249) & 0xff;
        buffer[1] = (dataCount % 250) & 0xff;
      } else {
        throw new Error(`message length not in valid ranges: ${dataCount}`);
      }
    }
    for (let i = 0; i < buffer.length; i++) {
      context.writeCodeword(base256Randomize255State(buffer[i]!, context.getCodewordCount() + 1));
    }
  }
}

export function newBase256Encoder(): Encoder {
  return new Base256Encoder();
}

function base256Randomize255State(ch: number, codewordPosition: number): number {
  const pseudoRandom = ((149 * codewordPosition) % 255) + 1;
  const tempVariable = ch + pseudoRandom;
  if (tempVariable <= 255) {
    return tempVariable & 0xff;
  }
  return (tempVariable - 256) & 0xff;
}
