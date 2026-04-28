import type { Encoder } from "./encoder.js";
import type { EncoderContext } from "./encoder_context.js";

import {
  HighLevelEncoder_ASCII_ENCODATION,
  HighLevelEncoder_C40_ENCODATION,
  HighLevelEncoder_C40_UNLATCH,
  highLevelEncoder_lookAheadTest,
} from "./high_level_encoder.js";

export type EncodeCharFn = (c: number, sb: number[]) => { lastCharSize: number; sb: number[] };

export class C40Encoder implements Encoder {
  readonly encodingMode: number;
  readonly encodeChar: EncodeCharFn;

  constructor(encodingMode: number, encodeChar: EncodeCharFn) {
    this.encodingMode = encodingMode;
    this.encodeChar = encodeChar;
  }

  getEncodingMode(): number {
    return this.encodingMode;
  }

  encode(context: EncoderContext): void {
    // step C
    let buffer: number[] = [];
    while (context.hasMoreCharacters()) {
      const c = context.getCurrentChar();
      context.pos++;

      let lastCharSize: number;
      ({ lastCharSize, sb: buffer } = this.encodeChar(c, buffer));

      const unwritten = Math.floor(buffer.length / 3) * 2;

      const curCodewordCount = context.getCodewordCount() + unwritten;
      context.updateSymbolInfoByLength(curCodewordCount);
      const available = context.getSymbolInfo().getDataCapacity() - curCodewordCount;

      if (!context.hasMoreCharacters()) {
        // Avoid having a single C40 value in the last triplet
        let removed: number[] = [];
        if (buffer.length % 3 === 2 && available !== 2) {
          ({ lastCharSize, buffer, removed } = this.backtrackOneCharacter(
            context,
            buffer,
            removed,
            lastCharSize,
          ));
        }
        while (buffer.length % 3 === 1 && (lastCharSize > 3 || available !== 1)) {
          ({ lastCharSize, buffer, removed } = this.backtrackOneCharacter(
            context,
            buffer,
            removed,
            lastCharSize,
          ));
        }
        break;
      }

      const count = buffer.length;
      if (count % 3 === 0) {
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

    c40HandleEOD(context, buffer);
  }

  private backtrackOneCharacter(
    context: EncoderContext,
    buffer: number[],
    removed: number[],
    lastCharSize: number,
  ): { lastCharSize: number; buffer: number[]; removed: number[] } {
    const newBuffer = buffer.slice(0, buffer.length - lastCharSize);
    context.pos--;
    const c = context.getCurrentChar();
    const res = this.encodeChar(c, removed);
    context.resetSymbolInfo(); // Deal with possible reduction in symbol size
    return { lastCharSize: res.lastCharSize, buffer: newBuffer, removed: res.sb };
  }
}

export function newC40Encoder(): Encoder {
  return new C40Encoder(HighLevelEncoder_C40_ENCODATION, c40EncodeChar);
}

export function c40WriteNextTriplet(context: EncoderContext, buffer: number[]): number[] {
  context.writeCodewords(c40EncodeToCodewords(buffer));
  return buffer.slice(3);
}

// c40HandleEOD handles "end of data" situations.
export function c40HandleEOD(context: EncoderContext, bufferIn: number[]): void {
  let buffer = bufferIn;
  const unwritten = Math.floor(buffer.length / 3) * 2;
  const rest = buffer.length % 3;

  const curCodewordCount = context.getCodewordCount() + unwritten;
  context.updateSymbolInfoByLength(curCodewordCount);
  const available = context.getSymbolInfo().getDataCapacity() - curCodewordCount;

  if (rest === 2) {
    buffer.push(0); // Shift 1
    while (buffer.length >= 3) {
      buffer = c40WriteNextTriplet(context, buffer);
    }
    if (context.hasMoreCharacters()) {
      context.writeCodeword(HighLevelEncoder_C40_UNLATCH);
    }
  } else if (available === 1 && rest === 1) {
    while (buffer.length >= 3) {
      buffer = c40WriteNextTriplet(context, buffer);
    }
    if (context.hasMoreCharacters()) {
      context.writeCodeword(HighLevelEncoder_C40_UNLATCH);
    }
    // else no unlatch
    context.pos--;
  } else if (rest === 0) {
    while (buffer.length >= 3) {
      buffer = c40WriteNextTriplet(context, buffer);
    }
    if (available > 0 || context.hasMoreCharacters()) {
      context.writeCodeword(HighLevelEncoder_C40_UNLATCH);
    }
  } else {
    throw new Error("unexpected case, please report");
  }
  context.signalEncoderChange(HighLevelEncoder_ASCII_ENCODATION);
}

export function c40EncodeChar(c: number, sb: number[]): { lastCharSize: number; sb: number[] } {
  if (c === 0x20 /* ' ' */) {
    sb.push(3);
    return { lastCharSize: 1, sb };
  }
  if (c >= 0x30 /* '0' */ && c <= 0x39 /* '9' */) {
    sb.push(c - 48 + 4);
    return { lastCharSize: 1, sb };
  }
  if (c >= 0x41 /* 'A' */ && c <= 0x5a /* 'Z' */) {
    sb.push(c - 65 + 14);
    return { lastCharSize: 1, sb };
  }
  if (c < 0x20 /* ' ' */) {
    sb.push(0); // Shift 1 Set
    sb.push(c);
    return { lastCharSize: 2, sb };
  }
  if (c <= 0x2f /* '/' */) {
    sb.push(1); // Shift 2 Set
    sb.push(c - 33);
    return { lastCharSize: 2, sb };
  }
  if (c <= 0x40 /* '@' */) {
    sb.push(1); // Shift 2 Set
    sb.push(c - 58 + 15);
    return { lastCharSize: 2, sb };
  }
  if (c <= 0x5f /* '_' */) {
    sb.push(1); // Shift 2 Set
    sb.push(c - 91 + 22);
    return { lastCharSize: 2, sb };
  }
  if (c <= 127) {
    sb.push(2); // Shift 3 Set
    sb.push(c - 96);
    return { lastCharSize: 2, sb };
  }
  sb.push(1, 0x1e); // Shift 2, Upper Shift
  const inner = c40EncodeChar(c - 128, sb);
  return { lastCharSize: inner.lastCharSize + 2, sb: inner.sb };
}

export function c40EncodeToCodewords(sb: number[]): number[] {
  const v = 1600 * sb[0]! + 40 * sb[1]! + sb[2]! + 1;
  const cw1 = Math.floor(v / 256) & 0xff;
  const cw2 = (v % 256) & 0xff;
  return [cw1, cw2];
}
