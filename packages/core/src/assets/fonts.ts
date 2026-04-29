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
 * URL where the bundled TTFs are mirrored. The Node loader reads fonts
 * from disk for canvas rendering, but `drawLabelAsSvg` may emit
 * `@font-face src: url(...)` references — those URLs need to resolve in
 * whichever browser ultimately views the SVG. Defaults to the same
 * jsdelivr URL the browser loader uses; override with `setFontBaseUrl` to
 * point at a self-hosted mirror.
 */
let baseUrl = "https://cdn.jsdelivr.net/gh/Fountain-Bio/zebrash-ts@main/src/assets/fonts/";

export function setFontBaseUrl(url: string): void {
  baseUrl = url.endsWith("/") ? url : `${url}/`;
}

export function getFontBaseUrl(): string {
  return baseUrl;
}

export function getFontFilename(key: FontKey): string {
  return filenames[key];
}
