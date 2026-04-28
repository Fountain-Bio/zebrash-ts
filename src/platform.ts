/**
 * Active platform — Node by default. Browser bundlers swap this file for
 * `src/platform-browser.ts` via the `package.json` `"browser"` field.
 *
 * Consumers always `import { platform } from "./platform.ts"`; the build
 * pipeline picks the right backend.
 */

export { platform } from "./platform/node.ts";
export type { Platform, PlatformCanvas, PlatformImageSource } from "./platform/types.ts";
export { inflate } from "./platform/inflate.ts";
