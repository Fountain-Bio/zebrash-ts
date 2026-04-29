import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Embedded-font loader (Node implementation).
 *
 * Reads the four bundled TTF files from disk on first request, caches the
 * bytes, and returns them as `Uint8Array`. The `package.json` `"browser"`
 * field swaps this file for `fonts-browser.ts` in browser bundles.
 */

export type FontKey = "HelveticaBold" | "DejavuSansMono" | "DejavuSansMonoBold" | "ZplGS";

const filenames: Record<FontKey, string> = {
  HelveticaBold: "HelveticaBoldCondensedCustom.ttf",
  DejavuSansMono: "DejaVuSansMono.ttf",
  DejavuSansMonoBold: "DejaVuSansMonoBold.ttf",
  ZplGS: "ZplGSCustom.ttf",
};

// `import.meta.url` lands at `<pkg>/src/assets/fonts.ts` (vitest source mode),
// `<pkg>/dist/assets/fonts.js` (built artifact), or
// `node_modules/@zebrash/core/dist/assets/fonts.js` (published tarball). In
// all three, the package root is two levels up from `moduleDir`, and the
// TTFs ship at `<pkg>/src/assets/fonts/` (via `package.json#files`). `tsc`
// does not copy non-TS assets, so resolving through src/ avoids any need
// for a postbuild copy step.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const fontsDir = resolve(moduleDir, "../../src/assets/fonts");

const cache = new Map<FontKey, Uint8Array>();

export async function getEmbeddedFont(key: FontKey): Promise<Uint8Array> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const data = readFileSync(join(fontsDir, filenames[key]));
  cache.set(key, data);
  return data;
}

/**
 * No-op on the Node path — fonts are read from disk relative to the module
 * URL. Provided so the browser-platform-swapped equivalent has a parallel
 * API surface.
 */
export function setFontBaseUrl(_url: string): void {
  // intentionally empty on Node
}
