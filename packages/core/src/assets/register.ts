import { platform } from "../platform.ts";
import { type FontKey, getEmbeddedFont } from "./fonts.ts";

// Family names are prefixed with "Zebrash" so they cannot collide with any
// fonts a host system may already have installed.
export const EmbeddedFontFamilies = {
  HelveticaBold: "ZebrashHelveticaBold",
  DejavuSansMono: "ZebrashDejavuSansMono",
  DejavuSansMonoBold: "ZebrashDejavuSansMonoBold",
  ZplGS: "ZebrashZplGS",
} as const;

export type EmbeddedFontFamily = (typeof EmbeddedFontFamilies)[keyof typeof EmbeddedFontFamilies];

const familyByKey: Record<FontKey, EmbeddedFontFamily> = {
  HelveticaBold: EmbeddedFontFamilies.HelveticaBold,
  DejavuSansMono: EmbeddedFontFamilies.DejavuSansMono,
  DejavuSansMonoBold: EmbeddedFontFamilies.DejavuSansMonoBold,
  ZplGS: EmbeddedFontFamilies.ZplGS,
};

let registerPromise: Promise<typeof EmbeddedFontFamilies> | null = null;

/**
 * Register the four embedded TTF fonts with the active platform's font
 * registry so subsequent canvas drawing can reference them by family name.
 *
 * - On Node: synchronous file read of bundled TTFs + `GlobalFonts.register`.
 * - On browser: parallel `fetch` of TTFs from a CDN + `FontFace.load`.
 *
 * Idempotent — concurrent and repeat calls reuse the same promise.
 */
export function registerEmbeddedFonts(): Promise<typeof EmbeddedFontFamilies> {
  if (registerPromise === null) {
    registerPromise = doRegister();
  }
  return registerPromise;
}

async function doRegister(): Promise<typeof EmbeddedFontFamilies> {
  const keys: FontKey[] = ["HelveticaBold", "DejavuSansMono", "DejavuSansMonoBold", "ZplGS"];
  await Promise.all(
    keys.map(async (key) => {
      const data = await getEmbeddedFont(key);
      await platform.registerFont(data, familyByKey[key]);
    }),
  );
  return EmbeddedFontFamilies;
}
