// Unit 19 — Maxicode encoder (port of github.com/ingridhq/maxicode).
export { encode, encode as encodeMaxicode, RS, GS, EOT } from "./maxicode.js";
export { SymbolGrid, SYMBOL_GRID_WIDTH, SYMBOL_GRID_HEIGHT } from "./symbolgrid.js";
export { Encoder as ReedSolomonEncoder, newEncoder } from "./readsolomon.js";

export const MAXICODE_COLS = 30;
export const MAXICODE_ROWS = 33;