import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the directory containing this module so font lookups work
// regardless of process cwd.
const moduleDir = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(moduleDir, "fonts");

const readFont = (filename: string): Uint8Array => readFileSync(join(fontsDir, filename));

// Slightly modified HelveticaBoldCondensed with some added glyphs for Polish and Turkish.
export const FontHelveticaBold: Uint8Array = readFont("HelveticaBoldCondensedCustom.ttf");

export const FontDejavuSansMono: Uint8Array = readFont("DejaVuSansMono.ttf");

export const FontDejavuSansMonoBold: Uint8Array = readFont("DejaVuSansMonoBold.ttf");

export const FontZplGS: Uint8Array = readFont("ZplGSCustom.ttf");
