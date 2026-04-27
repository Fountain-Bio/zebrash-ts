export {
  Ean13,
  type Ean13Bounds,
  type Ean13Pixel,
  calculateGuardExtension,
  isGuardBar,
  newEan13,
} from "./ean13.ts";
export {
  calcCheckNum,
  encode,
  encodeEan13,
  sanitizeContent,
  withCheckDigit,
} from "./encoder.ts";

export { calculateGuardExtension as calculateEan13GuardExtension } from "./ean13.ts";
