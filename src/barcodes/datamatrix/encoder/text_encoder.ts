import { C40Encoder } from "./c40_encoder.js";
import type { Encoder } from "./encoder.js";
import { HighLevelEncoder_TEXT_ENCODATION } from "./high_level_encoder.js";

export function newTextEncoder(): Encoder {
  return new C40Encoder(HighLevelEncoder_TEXT_ENCODATION, textEncodeChar);
}

export function textEncodeChar(c: number, sb: number[]): { lastCharSize: number; sb: number[] } {
  if (c === 0x20 /* ' ' */) {
    sb.push(3);
    return { lastCharSize: 1, sb };
  }
  if (c >= 0x30 /* '0' */ && c <= 0x39 /* '9' */) {
    sb.push(c - 48 + 4);
    return { lastCharSize: 1, sb };
  }
  if (c >= 0x61 /* 'a' */ && c <= 0x7a /* 'z' */) {
    sb.push(c - 97 + 14);
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
  if (c >= 0x5b /* '[' */ && c <= 0x5f /* '_' */) {
    sb.push(1); // Shift 2 Set
    sb.push(c - 91 + 22);
    return { lastCharSize: 2, sb };
  }
  if (c === 0x60 /* '`' */) {
    sb.push(2); // Shift 3 Set
    sb.push(0); // '`' - 96 == 0
    return { lastCharSize: 2, sb };
  }
  if (c <= 0x5a /* 'Z' */) {
    sb.push(2); // Shift 3 Set
    sb.push(c - 65 + 1);
    return { lastCharSize: 2, sb };
  }
  if (c <= 127) {
    sb.push(2); // Shift 3 Set
    sb.push(c - 123 + 27);
    return { lastCharSize: 2, sb };
  }
  sb.push(1, 0x1e); // Shift 2, Upper Shift
  const inner = textEncodeChar(c - 128, sb);
  return { lastCharSize: inner.lastCharSize + 2, sb: inner.sb };
}
