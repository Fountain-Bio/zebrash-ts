// Public entry point.
//
// Note: this is the integration scaffold. Some downstream consumers may still
// need adjustments (see `INTEGRATION.md` for the remaining gaps).

export { Parser } from "./parser.ts";
export { Drawer } from "./drawer.ts";
export type { DrawerOptions } from "./drawer-options.ts";
export { withDefaults as drawerOptionsWithDefaults } from "./drawer-options.ts";
export type { LabelInfo } from "./elements/index.ts";
