// Port of internal/barcodes/qrcode/encoder/error_correction_level.go

export const ErrorCorrectionLevel = {
  L: 0x01, // ~7% correction
  M: 0x00, // ~15% correction
  Q: 0x03, // ~25% correction
  H: 0x02, // ~30% correction
} as const;

export type ErrorCorrectionLevel = (typeof ErrorCorrectionLevel)[keyof typeof ErrorCorrectionLevel];

export function ErrorCorrectionLevel_ForBits(bits: number): ErrorCorrectionLevel {
  switch (bits) {
    case 0:
      return ErrorCorrectionLevel.M;
    case 1:
      return ErrorCorrectionLevel.L;
    case 2:
      return ErrorCorrectionLevel.H;
    case 3:
      return ErrorCorrectionLevel.Q;
    default:
      throw new Error("IllegalArgumentException");
  }
}

export function ErrorCorrectionLevel_GetBits(level: ErrorCorrectionLevel): number {
  return level;
}

export function ErrorCorrectionLevel_String(level: ErrorCorrectionLevel): string {
  switch (level) {
    case ErrorCorrectionLevel.M:
      return "M";
    case ErrorCorrectionLevel.L:
      return "L";
    case ErrorCorrectionLevel.H:
      return "H";
    case ErrorCorrectionLevel.Q:
      return "Q";
    default:
      return "";
  }
}

export function ErrorCorrectionLevel_ValueOf(s: string): ErrorCorrectionLevel {
  switch (s) {
    case "M":
      return ErrorCorrectionLevel.M;
    case "L":
      return ErrorCorrectionLevel.L;
    case "H":
      return ErrorCorrectionLevel.H;
    case "Q":
      return ErrorCorrectionLevel.Q;
    default:
      throw new Error(`IllegalArgumentException: ErrorCorrectionLevel ${s}`);
  }
}
