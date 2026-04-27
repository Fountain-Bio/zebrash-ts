export { ColorBlack, ColorTransparent, ColorWhite, rgbaToCss } from "./colors.ts";
export type { RGBA } from "./colors.ts";
export { encodeGrayscale, encodeMonochrome } from "./encode.ts";
export { reversePrint } from "./reverse_print.ts";
export { scaled } from "./scaled.ts";
export { zerofill } from "./zerofill.ts";

// Drawer-side string aliases — directly assignable to `ctx.fillStyle` /
// `ctx.strokeStyle`. (The `ColorBlack`/`ColorWhite` tuples remain available
// for code that needs raw RGBA channel data.)
export const colorBlack = "rgb(0, 0, 0)";
export const colorWhite = "rgb(255, 255, 255)";
