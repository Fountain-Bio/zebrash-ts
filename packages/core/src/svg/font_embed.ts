import type { SvgFontEmbedMode } from "../drawer-options.ts";

import { type FontKey, getEmbeddedFont, getFontBaseUrl, getFontFilename } from "../assets/fonts.ts";
import { EmbeddedFontFamilies } from "../assets/register.ts";

const familyByKey: Record<FontKey, string> = {
  HelveticaBold: EmbeddedFontFamilies.HelveticaBold,
  DejavuSansMono: EmbeddedFontFamilies.DejavuSansMono,
  DejavuSansMonoBold: EmbeddedFontFamilies.DejavuSansMonoBold,
  ZplGS: EmbeddedFontFamilies.ZplGS,
};

/**
 * Build the `<style>` body that goes inside the SVG's `<defs>` for the
 * fonts the label actually uses.
 *
 * `mode === "url"`  → `@font-face { src: url("<cdn>/font.ttf") format("truetype"); }`
 * `mode === "embed"` → `@font-face { src: url("data:font/ttf;base64,…") format("truetype"); }`
 * `mode === "none"` → empty string (caller's `<text font-family>` is on its own).
 */
export async function buildFontFaceCss(
  usedFonts: ReadonlySet<FontKey>,
  mode: SvgFontEmbedMode,
): Promise<string> {
  if (mode === "none" || usedFonts.size === 0) return "";

  if (mode === "url") {
    const base = getFontBaseUrl();
    const rules = [...usedFonts].map((key) => {
      const url = base + getFontFilename(key);
      return faceRule(familyByKey[key], `url("${url}") format("truetype")`);
    });
    return wrap(rules);
  }

  // mode === "embed"
  const rules = await Promise.all(
    [...usedFonts].map(async (key) => {
      const bytes = await getEmbeddedFont(key);
      const b64 = base64Encode(bytes);
      return faceRule(familyByKey[key], `url("data:font/ttf;base64,${b64}") format("truetype")`);
    }),
  );
  return wrap(rules);
}

function faceRule(family: string, src: string): string {
  return `@font-face{font-family:"${family}";src:${src};font-weight:normal;font-style:normal;}`;
}

function wrap(rules: string[]): string {
  return `<style>${rules.join("")}</style>`;
}

/**
 * Universal base64 encoder. Uses `Buffer` on Node (faster, handles huge
 * inputs without repeated string concat), falls back to `btoa(String
 * .fromCharCode(...))` chunked-loop on the browser. The `fromCharCode`
 * spread is chunked to stay under the JS engine's argument-count limit on
 * very large arrays.
 */
function base64Encode(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    bin += String.fromCharCode(...slice);
  }
  return btoa(bin);
}
