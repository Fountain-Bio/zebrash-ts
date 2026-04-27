import { decodeFontData } from "../hex/decode.js";
import {
  StoredFontDefaultPath,
  type VirtualPrinter,
  ensureExtensions,
  validateDevice,
} from "../printers/index.js";
import { type CommandParser, commandText, splitN } from "./command_parser.js";

let fontCounter = 0;

export function newDownloadUnboundedTtfParser(): CommandParser {
  const code = "~DU";

  return {
    CommandCode: code,
    Parse(command: string, printer: VirtualPrinter): null {
      const parts = splitN(commandText(command, code), ",", 3);

      let path = StoredFontDefaultPath;
      if (parts.length > 0 && parts[0] !== "") {
        path = parts[0] ?? path;
      }

      const err = validateDevice(path);
      if (err) {
        throw err;
      }

      let totalBytes = 0;
      if (parts.length > 1) {
        const v = Number.parseInt(parts[1] ?? "", 10);
        if (!Number.isNaN(v)) totalBytes = v;
      }

      let fontData: Uint8Array = new Uint8Array(0);
      if (parts.length > 2) {
        try {
          fontData = decodeFontData(parts[2] ?? "", totalBytes);
        } catch (e) {
          throw new Error(
            `failed to decode embedded true type font data: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }

      if (fontData.length === 0) {
        return null;
      }

      // The canvas drawer is responsible for parsing the TTF bytes and
      // registering them with @napi-rs/canvas's GlobalFonts at draw time —
      // hence we only need to track raw bytes plus a stable family name.
      const finalPath = ensureExtensions(path, "TTF", "FNT");
      const family = `zebrash-ttf-${++fontCounter}`;
      printer.StoredFonts.set(finalPath, { family, data: fontData });

      return null;
    },
  };
}
