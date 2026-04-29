import type { CommandParser } from "./command_parser.js";

import { newBarcode2of5Parser } from "./barcode_2of5.js";
import { newBarcode39Parser } from "./barcode_39.js";
import { newBarcode128Parser } from "./barcode_128.js";
import { newBarcodeAztecParser } from "./barcode_aztec.js";
import { newBarcodeDatamatrixParser } from "./barcode_datamatrix.js";
import { newBarcodeEan13Parser } from "./barcode_ean13.js";
import { newBarcodeFieldDefaultsParser } from "./barcode_field_defaults.js";
import { newBarcodePdf417Parser } from "./barcode_pdf417.js";
import { newBarcodeQrParser } from "./barcode_qr.js";

/** All barcode-related ZPL command parsers (`^BC`, `^BI`/`^B2`, `^B3`, ...). */
export const barcodeParsers: readonly CommandParser[] = [
  newBarcode128Parser(),
  newBarcodeEan13Parser(),
  newBarcode2of5Parser(),
  newBarcode39Parser(),
  newBarcodePdf417Parser(),
  newBarcodeAztecParser(),
  newBarcodeDatamatrixParser(),
  newBarcodeQrParser(),
  newBarcodeFieldDefaultsParser(),
];
