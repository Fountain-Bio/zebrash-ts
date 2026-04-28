// Unit 16 (PDF417) — public API.
export { encode, toMatrix } from "./encoder.js";
export type { PDF417Result } from "./encoder.js";
export { highlevelEncode, EncodingMode } from "./highlevel.js";
export { computeErrorCorrection, errorCorrectionWordCount } from "./errorcorrection.js";
export type { SecurityLevel } from "./errorcorrection.js";
export { calcDimensions, minCols, maxCols, minRows, maxRows } from "./dimensions.js";
export { codewords, getCodeword, START_WORD, STOP_WORD } from "./codewords.js";

export { encode as encodePdf417 } from "./encoder.js";
