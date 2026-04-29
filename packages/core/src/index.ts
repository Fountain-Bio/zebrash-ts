// Public entry point.
//
// Note: this is the integration scaffold. Some downstream consumers may still
// need adjustments (see `INTEGRATION.md` for the remaining gaps).

export { Parser } from "./parser.ts";
export { Drawer } from "./drawer.ts";
export type { DrawerOptions, SvgFontEmbedMode } from "./drawer-options.ts";
export { withDefaults as drawerOptionsWithDefaults } from "./drawer-options.ts";
export type { LabelInfo } from "./elements/index.ts";

// SVG output surface — for advanced consumers who want to register custom
// per-element SVG emitters.
export { SvgEmitter } from "./svg/emitter.ts";
export type { SvgElementDrawer } from "./svg-drawers/index.ts";
export { defaultSvgElementDrawers } from "./svg-drawers/index.ts";
