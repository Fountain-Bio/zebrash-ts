import type { DrawerOptions } from "../drawer-options.ts";
import type { DrawerState } from "../drawers/drawer_state.ts";
import type { SvgEmitter } from "../svg/emitter.ts";

/**
 * Emits one ZPL element as SVG. SVG-side analog of `ElementDrawer` —
 * each per-element drawer (graphic box, text field, barcode, …) is realised
 * as one of these. Mirrors the "every drawer early-returns if `el._kind`
 * doesn't match" pattern from the canvas pipeline.
 */
export interface SvgElementDrawer {
  draw(
    emitter: SvgEmitter,
    element: unknown,
    options: DrawerOptions,
    state: DrawerState,
  ): void | Promise<void>;
}
