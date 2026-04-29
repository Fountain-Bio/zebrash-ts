/**
 * Embedded-font loader (browser implementation).
 *
 * Lazily fetches the four bundled TTFs from a CDN URL on first use, caches
 * the bytes, and returns them as `Uint8Array`. Called via the `package.json`
 * `"browser"` field swap when bundling for the browser.
 *
 * Default base URL serves the fonts directly from the public GitHub repo via
 * jsdelivr. Override via `setFontBaseUrl(...)` to self-host (CSP, offline,
 * version-pinning).
 */

export type FontKey = "HelveticaBold" | "DejavuSansMono" | "DejavuSansMonoBold" | "ZplGS";

const filenames: Record<FontKey, string> = {
  HelveticaBold: "HelveticaBoldCondensedCustom.ttf",
  DejavuSansMono: "DejaVuSansMono.ttf",
  DejavuSansMonoBold: "DejaVuSansMonoBold.ttf",
  ZplGS: "ZplGSCustom.ttf",
};

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

const cache = new Map<FontKey, Uint8Array>();
const inflight = new Map<FontKey, Promise<Uint8Array>>();

export async function getEmbeddedFont(key: FontKey): Promise<Uint8Array> {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const existing = inflight.get(key);
  if (existing !== undefined) return existing;

  const promise = (async () => {
    const url = baseUrl + filenames[key];
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`zebrash: failed to fetch font "${key}" from ${url}: ${response.status}`);
    }
    const data = new Uint8Array(await response.arrayBuffer());
    cache.set(key, data);
    inflight.delete(key);
    return data;
  })();
  inflight.set(key, promise);
  return promise;
}
