// Ported from internal/printers/fs.go.
// Path/device helpers for ZPL stored-resource references such as "R:LOGO.GRF".

export const StoredFormatDefaultPath = "R:UNKNOWN.ZPL";
export const StoredGraphicsDefaultPath = "R:UNKNOWN.GRF";
export const StoredFontDefaultPath = "R:UNKNOWN.FNT";

const validDevices = ["R", "E", "B", "A", "Z"] as const;

/**
 * Validates that a stored-resource path begins with a known device prefix
 * (e.g. "R:FOO.GRF"). Throws when the path is malformed.
 */
export function validateDevice(path: string): void {
  const colonIdx = path.indexOf(":");
  if (colonIdx === -1) {
    throw new Error("path does not contain device name");
  }

  const device = path.slice(0, colonIdx);
  if (!validDevices.includes(device as (typeof validDevices)[number])) {
    throw new Error(`invalid device name ${device}, must be one of ${validDevices.join(", ")}`);
  }
}

/**
 * If `path` already has one of the allowed extensions, returns it unchanged.
 * Otherwise replaces (or appends) the extension with the first one in `exts`.
 *
 * Mirrors Go's strings.SplitN(path, ".", 2): only the first "." is treated as
 * the extension separator, so "FOO.BAR.GRF" splits into "FOO" / "BAR.GRF".
 */
export function ensureExtensions(path: string, ...exts: string[]): string {
  if (exts.length === 0) {
    return path;
  }

  const dotIdx = path.indexOf(".");
  if (dotIdx !== -1) {
    const currentExt = path.slice(dotIdx + 1);
    if (exts.includes(currentExt)) {
      return path;
    }
  }

  const stem = dotIdx === -1 ? path : path.slice(0, dotIdx);
  return `${stem}.${exts[0]}`;
}
