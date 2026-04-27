import { GlobalFonts } from "@napi-rs/canvas";
import {
  FontDejavuSansMono,
  FontDejavuSansMonoBold,
  FontHelveticaBold,
  FontZplGS,
} from "./fonts.ts";

// Family names are prefixed with "Zebrash" so they cannot collide with any
// fonts a host system may already have installed.
export const EmbeddedFontFamilies = {
  HelveticaBold: "ZebrashHelveticaBold",
  DejavuSansMono: "ZebrashDejavuSansMono",
  DejavuSansMonoBold: "ZebrashDejavuSansMonoBold",
  ZplGS: "ZebrashZplGS",
} as const;

export type EmbeddedFontFamily = (typeof EmbeddedFontFamilies)[keyof typeof EmbeddedFontFamilies];

let registered = false;

/**
 * Register the four embedded TTF fonts with `@napi-rs/canvas`'s global font
 * registry so subsequent canvas drawing can reference them by family name.
 *
 * Idempotent — repeated calls are no-ops. Returns the family-name → key
 * mapping so callers can pick a family without hard-coding the strings.
 */
export function registerEmbeddedFonts(): typeof EmbeddedFontFamilies {
  if (registered) {
    return EmbeddedFontFamilies;
  }

  GlobalFonts.register(Buffer.from(FontHelveticaBold), EmbeddedFontFamilies.HelveticaBold);
  GlobalFonts.register(Buffer.from(FontDejavuSansMono), EmbeddedFontFamilies.DejavuSansMono);
  GlobalFonts.register(
    Buffer.from(FontDejavuSansMonoBold),
    EmbeddedFontFamilies.DejavuSansMonoBold,
  );
  GlobalFonts.register(Buffer.from(FontZplGS), EmbeddedFontFamilies.ZplGS);

  registered = true;
  return EmbeddedFontFamilies;
}
