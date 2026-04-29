// Port of internal/barcodes/qrcode/encoder/options.go

import type { Mode } from "./mode.ts";

export interface Options {
  Mode?: Mode | null;
  CharacterSetName?: string;
  AppendGS1?: boolean;
  VersionNumber?: number;
  MaskPattern?: number | null;
  QuietZone?: number;
}
