// Unit 18 (DataMatrix) - top-level exports.
export { encode } from "./datamatrix_writer.js";
export { Dimension, newDimension } from "./encoder/dimension.js";
export { SymbolShapeHint } from "./encoder/symbol_shape_hint.js";
export { defaultOptions, type Options } from "./encoder/options.js";
export { encodeHighLevel } from "./encoder/high_level_encoder.js";
export { errorCorrection_encodeECC200 } from "./encoder/error_correction.js";
export { SymbolInfo, symbolInfoLookup } from "./encoder/symbol_info.js";
export { DefaultPlacement, newDefaultPlacement } from "./encoder/default_placement.js";
export { ByteMatrix, newByteMatrix } from "./encoder/byte_matrix.js";

export { encode as encodeDatamatrix } from "./datamatrix_writer.js";