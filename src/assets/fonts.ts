import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

const moduleDir = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(moduleDir, "fonts");

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
