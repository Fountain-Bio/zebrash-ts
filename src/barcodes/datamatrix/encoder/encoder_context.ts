import type { Dimension } from "./dimension.js";
import type { Options } from "./options.js";
import { type SymbolInfo, symbolInfoLookup } from "./symbol_info.js";
import { SymbolShapeHint } from "./symbol_shape_hint.js";

function encodeISO88591(msg: string): Uint8Array {
  const out = new Uint8Array(msg.length);
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c > 0xff) {
      throw new Error(`message contains characters outside ISO-8859-1 encoding. char code ${c}`);
    }
    out[i] = c & 0xff;
  }
  return out;
}

export class EncoderContext {
  private msg: Uint8Array;
  opts: Options;
  codewords: number[];
  pos: number;
  private newEncoding: number;
  private symbolInfo: SymbolInfo | null;
  private skipAtEnd: number;

  constructor(msg: string) {
    this.msg = encodeISO88591(msg);
    this.opts = { shape: SymbolShapeHint.FORCE_NONE };
    this.codewords = [];
    this.pos = 0;
    this.newEncoding = -1;
    this.symbolInfo = null;
    this.skipAtEnd = 0;
  }

  setSymbolShape(shape: SymbolShapeHint): void {
    this.opts.shape = shape;
  }

  setSizeConstraints(
    minSize: Dimension | null | undefined,
    maxSize: Dimension | null | undefined,
  ): void {
    this.opts.minSize = minSize ?? null;
    this.opts.maxSize = maxSize ?? null;
  }

  getMessage(): Uint8Array {
    return this.msg;
  }

  setSkipAtEnd(count: number): void {
    this.skipAtEnd = count;
  }

  getCurrentChar(): number {
    return this.msg[this.pos]!;
  }

  getCurrent(): number {
    return this.msg[this.pos]!;
  }

  getCodewords(): number[] {
    return this.codewords;
  }

  writeCodewords(codewords: number[] | Uint8Array): void {
    for (const c of codewords) {
      this.codewords.push(c & 0xff);
    }
  }

  writeCodeword(codeword: number): void {
    this.codewords.push(codeword & 0xff);
  }

  getCodewordCount(): number {
    return this.codewords.length;
  }

  getNewEncoding(): number {
    return this.newEncoding;
  }

  signalEncoderChange(encoding: number): void {
    this.newEncoding = encoding;
  }

  resetEncoderSignal(): void {
    this.newEncoding = -1;
  }

  hasMoreCharacters(): boolean {
    return this.pos < this.getTotalMessageCharCount();
  }

  private getTotalMessageCharCount(): number {
    return this.msg.length - this.skipAtEnd;
  }

  getRemainingCharacters(): number {
    return this.getTotalMessageCharCount() - this.pos;
  }

  getSymbolInfo(): SymbolInfo {
    if (this.symbolInfo === null) {
      throw new Error("symbol info not yet computed");
    }
    return this.symbolInfo;
  }

  updateSymbolInfo(): void {
    this.updateSymbolInfoByLength(this.getCodewordCount());
  }

  updateSymbolInfoByLength(len: number): void {
    if (this.symbolInfo === null || len > this.symbolInfo.getDataCapacity()) {
      this.symbolInfo = symbolInfoLookup(len, this.opts, true);
    }
  }

  resetSymbolInfo(): void {
    this.symbolInfo = null;
  }
}

export function newEncoderContext(msg: string): EncoderContext {
  return new EncoderContext(msg);
}
