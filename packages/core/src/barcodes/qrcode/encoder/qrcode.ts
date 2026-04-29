// Port of internal/barcodes/qrcode/encoder/qrcode.go

import type { ByteMatrix } from "./byte-matrix.ts";
import type { Mode } from "./mode.ts";
import type { Version } from "./version.ts";

import {
  type ErrorCorrectionLevel,
  ErrorCorrectionLevel_String,
} from "./error-correction-level.ts";

export const QRCode_NUM_MASK_PATERNS = 8;

export class QRCode {
  private mode: Mode | null;
  private ecLevel: ErrorCorrectionLevel;
  private version: Version | null;
  private maskPattern: number;
  private matrix: ByteMatrix | null;

  constructor() {
    this.mode = null;
    this.ecLevel = 0 as ErrorCorrectionLevel;
    this.version = null;
    this.maskPattern = -1;
    this.matrix = null;
  }

  getMode(): Mode | null {
    return this.mode;
  }

  getECLevel(): ErrorCorrectionLevel {
    return this.ecLevel;
  }

  getVersion(): Version | null {
    return this.version;
  }

  getMaskPattern(): number {
    return this.maskPattern;
  }

  getMatrix(): ByteMatrix | null {
    return this.matrix;
  }

  setMode(value: Mode): void {
    this.mode = value;
  }

  setECLevel(value: ErrorCorrectionLevel): void {
    this.ecLevel = value;
  }

  setVersion(value: Version): void {
    this.version = value;
  }

  setMaskPattern(value: number): void {
    this.maskPattern = value;
  }

  setMatrix(value: ByteMatrix): void {
    this.matrix = value;
  }

  toString(): string {
    let out = "<<\n";
    out += ` mode: ${this.mode === null ? "" : this.mode.toString()}`;
    out += `\n ecLevel: ${ErrorCorrectionLevel_String(this.ecLevel)}`;
    out += `\n version: ${this.version === null ? "" : this.version.toString()}`;
    out += `\n maskPattern: ${this.maskPattern}`;
    if (this.matrix === null) {
      out += "\n matrix: nil\n";
    } else {
      out += `\n matrix:\n${this.matrix.toString()}`;
    }
    out += ">>\n";
    return out;
  }
}

export function QRCode_IsValidMaskPattern(maskPattern: number): boolean {
  return maskPattern >= 0 && maskPattern < QRCode_NUM_MASK_PATERNS;
}
