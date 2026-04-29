// Port of internal/barcodes/qrcode/encoder/mode.go

import type { Version } from "./version.ts";

export class Mode {
  private characterCountBitsForVersions: readonly number[];
  private bits: number;
  // Used purely for diagnostics / String()
  readonly name: string;

  constructor(characterCountBitsForVersions: readonly number[], bits: number, name: string) {
    this.characterCountBitsForVersions = characterCountBitsForVersions;
    this.bits = bits;
    this.name = name;
  }

  getCharacterCountBits(version: Version): number {
    const number = version.getVersionNumber();
    let offset: number;
    if (number <= 9) {
      offset = 0;
    } else if (number <= 26) {
      offset = 1;
    } else {
      offset = 2;
    }
    return this.characterCountBitsForVersions[offset] ?? 0;
  }

  getBits(): number {
    return this.bits;
  }

  toString(): string {
    return this.name;
  }
}

export const Mode_TERMINATOR = new Mode([0, 0, 0], 0x00, "TERMINATOR");
export const Mode_NUMERIC = new Mode([10, 12, 14], 0x01, "NUMERIC");
export const Mode_ALPHANUMERIC = new Mode([9, 11, 13], 0x02, "ALPHANUMERIC");
export const Mode_STRUCTURED_APPEND = new Mode([0, 0, 0], 0x03, "STRUCTURED_APPEND");
export const Mode_BYTE = new Mode([8, 16, 16], 0x04, "BYTE");
export const Mode_ECI = new Mode([0, 0, 0], 0x07, "ECI");
export const Mode_KANJI = new Mode([8, 10, 12], 0x08, "KANJI");
export const Mode_FNC1_FIRST_POSITION = new Mode([0, 0, 0], 0x05, "FNC1_FIRST_POSITION");
export const Mode_FNC1_SECOND_POSITION = new Mode([0, 0, 0], 0x09, "FNC1_SECOND_POSITION");
export const Mode_HANZI = new Mode([8, 10, 12], 0x0d, "HANZI");

export function ModeForBits(bits: number): Mode {
  switch (bits) {
    case 0x0:
      return Mode_TERMINATOR;
    case 0x1:
      return Mode_NUMERIC;
    case 0x2:
      return Mode_ALPHANUMERIC;
    case 0x3:
      return Mode_STRUCTURED_APPEND;
    case 0x4:
      return Mode_BYTE;
    case 0x5:
      return Mode_FNC1_FIRST_POSITION;
    case 0x7:
      return Mode_ECI;
    case 0x8:
      return Mode_KANJI;
    case 0x9:
      return Mode_FNC1_SECOND_POSITION;
    case 0xd:
      return Mode_HANZI;
    default:
      throw new Error("IllegalArgumentException");
  }
}
