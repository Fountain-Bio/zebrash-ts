import { describe, expect, it } from "vitest";

import {
  StoredFontDefaultPath,
  StoredFormatDefaultPath,
  StoredGraphicsDefaultPath,
  ensureExtensions,
  validateDevice,
} from "./fs.js";

describe("validateDevice", () => {
  it("accepts each valid device prefix", () => {
    for (const dev of ["R", "E", "B", "A", "Z"]) {
      expect(() => validateDevice(`${dev}:FILE.ZPL`)).not.toThrow();
    }
  });

  it("rejects missing colon", () => {
    expect(() => validateDevice("FILE.ZPL")).toThrow(/path does not contain device name/);
  });

  it("rejects unknown device prefix", () => {
    expect(() => validateDevice("Q:FILE.ZPL")).toThrow(/invalid device name Q/);
  });
});

describe("ensureExtensions", () => {
  it("returns the path unchanged when no extensions are provided", () => {
    expect(ensureExtensions("R:FOO")).toBe("R:FOO");
  });

  it("returns the path unchanged when current extension is allowed", () => {
    expect(ensureExtensions("R:FOO.GRF", "GRF", "PNG")).toBe("R:FOO.GRF");
  });

  it("replaces a disallowed extension with the first allowed one", () => {
    expect(ensureExtensions("R:FOO.TXT", "GRF", "PNG")).toBe("R:FOO.GRF");
  });

  it("appends an extension when the path has none", () => {
    expect(ensureExtensions("R:FOO", "ZPL")).toBe("R:FOO.ZPL");
  });

  it("treats only the first dot as the extension separator", () => {
    // Go's strings.SplitN(path, ".", 2) yields ["R:FOO", "BAR.GRF"]. "BAR.GRF"
    // is not an allowed extension, so the stem keeps everything before the
    // first dot and the first allowed extension is appended.
    expect(ensureExtensions("R:FOO.BAR.GRF", "GRF")).toBe("R:FOO.GRF");
    // When the post-first-dot portion exactly matches an allowed extension,
    // the original path is returned unchanged.
    expect(ensureExtensions("R:FOO.BAR.GRF", "BAR.GRF")).toBe("R:FOO.BAR.GRF");
  });
});

describe("default paths", () => {
  it("match the Go constants", () => {
    expect(StoredFormatDefaultPath).toBe("R:UNKNOWN.ZPL");
    expect(StoredGraphicsDefaultPath).toBe("R:UNKNOWN.GRF");
    expect(StoredFontDefaultPath).toBe("R:UNKNOWN.FNT");
  });
});
