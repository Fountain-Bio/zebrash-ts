// Aggregated public surface for the SVG element drawers.

export { type SvgElementDrawer } from "./svg_element_drawer.ts";
export {
  rotateAbout as svgRotateAbout,
  rotateForOrientation as svgRotateForOrientation,
  rotateImage as svgRotateImage,
  scaleAbout as svgScaleAbout,
} from "./transform.ts";

import type { SvgElementDrawer } from "./svg_element_drawer.ts";

import { newBarcode2of5SvgDrawer } from "./barcode_2of5.ts";
import { newBarcode39SvgDrawer } from "./barcode_39.ts";
import { newBarcode128SvgDrawer } from "./barcode_128.ts";
import { newBarcodeAztecSvgDrawer } from "./barcode_aztec.ts";
import { newBarcodeDatamatrixSvgDrawer } from "./barcode_datamatrix.ts";
import { newBarcodeEan13SvgDrawer } from "./barcode_ean13.ts";
import { newBarcodePdf417SvgDrawer } from "./barcode_pdf417.ts";
import { newBarcodeQrSvgDrawer } from "./barcode_qr.ts";
import { newGraphicBoxSvgDrawer } from "./graphic_box.ts";
import { newGraphicCircleSvgDrawer } from "./graphic_circle.ts";
import { newGraphicDiagonalLineSvgDrawer } from "./graphic_diagonal_line.ts";
import { newGraphicFieldSvgDrawer } from "./graphic_field.ts";
import { newMaxicodeSvgDrawer } from "./maxicode.ts";
import { newTextFieldSvgDrawer } from "./text_field.ts";

/**
 * Returns the full set of SVG element drawers in the same order
 * `defaultElementDrawers()` registers their canvas siblings, so the SVG
 * pipeline mirrors the PNG one's element-dispatch behaviour.
 */
export function defaultSvgElementDrawers(): SvgElementDrawer[] {
  return [
    newGraphicBoxSvgDrawer(),
    newGraphicCircleSvgDrawer(),
    newGraphicFieldSvgDrawer(),
    newGraphicDiagonalLineSvgDrawer(),
    newTextFieldSvgDrawer(),
    newMaxicodeSvgDrawer(),
    newBarcode128SvgDrawer(),
    newBarcodeEan13SvgDrawer(),
    newBarcode2of5SvgDrawer(),
    newBarcode39SvgDrawer(),
    newBarcodePdf417SvgDrawer(),
    newBarcodeAztecSvgDrawer(),
    newBarcodeDatamatrixSvgDrawer(),
    newBarcodeQrSvgDrawer(),
  ];
}
