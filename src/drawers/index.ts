// Aggregated public surface for all element drawers.

export type { ElementDrawer } from "./element_drawer.ts";
export {
  adjustImageTypeSetPosition,
  rotateAbout,
  rotateForOrientation,
  rotateImage,
  scaleAbout,
  setLineColor,
} from "./element_drawer.ts";
export { DrawerState } from "./drawer_state.ts";
import { DrawerState as _DS } from "./drawer_state.ts";
export const newDrawerState = (): _DS => new _DS();

import type { ElementDrawer } from "./element_drawer.ts";
import { newBarcode128Drawer } from "./barcode_128.ts";
import { newBarcode2of5Drawer } from "./barcode_2of5.ts";
import { newBarcode39Drawer } from "./barcode_39.ts";
import { newBarcodeAztecDrawer } from "./barcode_aztec.ts";
import { newBarcodeDatamatrixDrawer } from "./barcode_datamatrix.ts";
import { newBarcodeEan13Drawer } from "./barcode_ean13.ts";
import { newBarcodePdf417Drawer } from "./barcode_pdf417.ts";
import { newBarcodeQrDrawer } from "./barcode_qr.ts";
import { newGraphicBoxDrawer } from "./graphic_box.ts";
import { newGraphicCircleDrawer } from "./graphic_circle.ts";
import { newGraphicDiagonalLineDrawer } from "./graphic_diagonal_line.ts";
import { newGraphicFieldDrawer } from "./graphic_field.ts";
import { newMaxicodeDrawer } from "./maxicode.ts";
import { newTextFieldDrawer } from "./text_field.ts";

/**
 * Returns the full set of element drawers in the order Go's `NewDrawer`
 * registers them.
 */
export function defaultElementDrawers(): ElementDrawer[] {
  return [
    newGraphicBoxDrawer(),
    newGraphicCircleDrawer(),
    newGraphicFieldDrawer(),
    newGraphicDiagonalLineDrawer(),
    newTextFieldDrawer() as ElementDrawer,
    newMaxicodeDrawer(),
    newBarcode128Drawer(),
    newBarcodeEan13Drawer(),
    newBarcode2of5Drawer(),
    newBarcode39Drawer(),
    newBarcodePdf417Drawer(),
    newBarcodeAztecDrawer(),
    newBarcodeDatamatrixDrawer(),
    newBarcodeQrDrawer(),
  ];
}
