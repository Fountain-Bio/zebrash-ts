/**
 * Browser-side substitute for `./platform.ts`. The `package.json` `"browser"`
 * map causes bundlers (Vite, webpack, esbuild, Rollup) to replace
 * `./platform.js` with this file when targeting the browser.
 */

export { platform } from "./platform/browser.ts";
export type { Platform, PlatformCanvas, PlatformImageSource } from "./platform/types.ts";
export { inflate } from "./platform/inflate.ts";
