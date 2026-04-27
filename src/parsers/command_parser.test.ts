import { describe, expect, it } from "vitest";
import { BarcodeMode, FieldAlignment, FieldOrientation, TextAlignment } from "../elements/index.ts";
import {
  canParse,
  commandText,
  splitCommand,
  toBoolField,
  toFieldAlignment,
  toFieldBarcodeMode,
  toFieldOrientation,
  toPositiveIntField,
  toTextAlignment,
  toValidFontName,
} from "./command_parser.ts";

describe("canParse", () => {
  it("returns true when the command starts with the registered code", () => {
    expect(canParse({ commandCode: "^FO", parse: () => null }, "^FO10,20")).toBe(true);
  });

  it("returns false when the command does not start with the code", () => {
    expect(canParse({ commandCode: "^FO", parse: () => null }, "^FD10,20")).toBe(false);
  });
});

describe("splitCommand", () => {
  it("splits the variable section after prefix+pos on commas", () => {
    expect(splitCommand("^FO10,20,30", "^FO", 0)).toEqual(["10", "20", "30"]);
  });

  it("respects pos offset by skipping past `pos` chars after the prefix", () => {
    // ^B3 + 1 char of orientation, then 4 comma-separated args.
    expect(splitCommand("^B3NY,50,y,N", "^B3", 1)).toEqual(["Y", "50", "Y", "N"]);
  });
});

describe("commandText", () => {
  it("returns the command without its prefix", () => {
    expect(commandText("^FDhello world", "^FD")).toBe("hello world");
  });
});

describe("toFieldOrientation", () => {
  it("maps N/R/I/B to the correct orientation", () => {
    expect(toFieldOrientation("N")).toBe(FieldOrientation.Normal);
    expect(toFieldOrientation("R")).toBe(FieldOrientation.Rotate90);
    expect(toFieldOrientation("I")).toBe(FieldOrientation.Rotate180);
    expect(toFieldOrientation("B")).toBe(FieldOrientation.Rotate270);
  });

  it("falls back to Normal for unknown values", () => {
    expect(toFieldOrientation("X")).toBe(FieldOrientation.Normal);
    expect(toFieldOrientation("")).toBe(FieldOrientation.Normal);
  });
});

describe("toFieldAlignment", () => {
  it("maps numeric strings to alignments", () => {
    expect(toFieldAlignment("0")).toEqual({ alignment: FieldAlignment.Left, ok: true });
    expect(toFieldAlignment("1")).toEqual({ alignment: FieldAlignment.Right, ok: true });
    expect(toFieldAlignment("2")).toEqual({ alignment: FieldAlignment.Auto, ok: true });
  });

  it("returns ok=false for non-numeric or out-of-range input", () => {
    expect(toFieldAlignment("3")).toEqual({ alignment: FieldAlignment.Left, ok: false });
    expect(toFieldAlignment("abc")).toEqual({ alignment: FieldAlignment.Left, ok: false });
    expect(toFieldAlignment("")).toEqual({ alignment: FieldAlignment.Left, ok: false });
  });
});

describe("toTextAlignment", () => {
  it("maps L/R/J/C to the correct alignment", () => {
    expect(toTextAlignment("L")).toBe(TextAlignment.Left);
    expect(toTextAlignment("R")).toBe(TextAlignment.Right);
    expect(toTextAlignment("J")).toBe(TextAlignment.Justified);
    expect(toTextAlignment("C")).toBe(TextAlignment.Center);
  });

  it("falls back to Left for unknown values", () => {
    expect(toTextAlignment("?")).toBe(TextAlignment.Left);
  });
});

describe("toFieldBarcodeMode", () => {
  it("maps U/A/D to the correct mode", () => {
    expect(toFieldBarcodeMode("U")).toBe(BarcodeMode.Ucc);
    expect(toFieldBarcodeMode("A")).toBe(BarcodeMode.Automatic);
    expect(toFieldBarcodeMode("D")).toBe(BarcodeMode.Ean);
  });

  it("returns No for unknown values", () => {
    expect(toFieldBarcodeMode("N")).toBe(BarcodeMode.No);
    expect(toFieldBarcodeMode("")).toBe(BarcodeMode.No);
  });
});

describe("toBoolField", () => {
  it("returns true only for 'Y'", () => {
    expect(toBoolField("Y")).toBe(true);
    expect(toBoolField("N")).toBe(false);
    expect(toBoolField("")).toBe(false);
  });
});

describe("toPositiveIntField", () => {
  it("rounds and abs's the parsed float", () => {
    expect(toPositiveIntField("12.6")).toEqual({ value: 13, ok: true });
    expect(toPositiveIntField(" -7.4 ")).toEqual({ value: 7, ok: true });
    expect(toPositiveIntField("0")).toEqual({ value: 0, ok: true });
  });

  it("returns ok=false on non-numeric input", () => {
    expect(toPositiveIntField("")).toEqual({ value: 0, ok: false });
    expect(toPositiveIntField("abc")).toEqual({ value: 0, ok: false });
  });
});

describe("toValidFontName", () => {
  it("uppercases and returns the first character when alphanumeric", () => {
    expect(toValidFontName("a")).toBe("A");
    expect(toValidFontName("Z")).toBe("Z");
    expect(toValidFontName("7stuff")).toBe("7");
  });

  it("returns 'A' when the first char is not alphanumeric", () => {
    expect(toValidFontName("!")).toBe("A");
    expect(toValidFontName("-x")).toBe("A");
  });

  it("returns empty string when input is empty/whitespace", () => {
    expect(toValidFontName("")).toBe("");
    expect(toValidFontName("   ")).toBe("");
  });
});
