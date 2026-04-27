import { describe, expect, it } from "vitest";
import { FieldAlignment, FieldOrientation, newFontInfo } from "../elements/index.js";
import { VirtualPrinter, newVirtualPrinter } from "./virtual.js";

describe("newVirtualPrinter", () => {
  it("constructs with the same defaults as Go's NewVirtualPrinter", () => {
    const p = newVirtualPrinter();

    expect(p).toBeInstanceOf(VirtualPrinter);
    expect(p.storedGraphics.size).toBe(0);
    expect(p.storedFormats.size).toBe(0);
    expect(p.storedFonts.size).toBe(0);
    expect(p.storedFontAliases.size).toBe(0);

    expect(p.defaultFont.name).toBe("A");
    expect(p.defaultFont.width).toBe(0);
    expect(p.defaultFont.height).toBe(0);
    expect(p.defaultFont.orientation).toBe(FieldOrientation.Normal);
    expect(p.defaultFont.customFont).toBeNull();

    expect(p.defaultAlignment).toBe(FieldAlignment.Left);
    expect(p.defaultOrientation).toBe(FieldOrientation.Normal);

    expect(p.defaultBarcodeDimensions).toEqual({
      moduleWidth: 2,
      height: 10,
      widthRatio: 3,
    });

    expect(p.nextElementFieldNumber).toBe(-1);
    expect(p.nextElementFieldData).toBe("");
    expect(p.nextElementFieldElement).toBeNull();
    expect(p.nextElementAlignment).toBeNull();
    expect(p.nextFont).toBeNull();
    expect(p.nextDownloadFormatName).toBe("");
    expect(p.nextHexEscapeChar).toBe(0);
    expect(p.nextElementFieldReverse).toBe(false);

    expect(p.labelReverse).toBe(false);
    expect(p.labelInverted).toBe(false);
    expect(p.currentCharset).toBe(0);
    expect(p.printWidth).toBe(0);

    expect(p.labelHomePosition).toEqual({
      x: 0,
      y: 0,
      calculateFromBottom: false,
      automaticPosition: false,
    });
    expect(p.nextElementPosition).toEqual({
      x: 0,
      y: 0,
      calculateFromBottom: false,
      automaticPosition: false,
    });
  });
});

describe("VirtualPrinter.setDefaultOrientation", () => {
  it("propagates the orientation to the default font", () => {
    const p = newVirtualPrinter();
    p.setDefaultOrientation(FieldOrientation.Rotate90);

    expect(p.defaultOrientation).toBe(FieldOrientation.Rotate90);
    expect(p.defaultFont.orientation).toBe(FieldOrientation.Rotate90);
  });

  it("propagates the orientation to the next font when set", () => {
    const p = newVirtualPrinter();
    p.nextFont = newFontInfo({ name: "B" });

    p.setDefaultOrientation(FieldOrientation.Rotate180);

    expect(p.nextFont.orientation).toBe(FieldOrientation.Rotate180);
    expect(p.defaultFont.orientation).toBe(FieldOrientation.Rotate180);
  });

  it("does nothing to nextFont when it is null", () => {
    const p = newVirtualPrinter();
    p.setDefaultOrientation(FieldOrientation.Rotate270);
    expect(p.nextFont).toBeNull();
  });
});

describe("VirtualPrinter.getNextFontOrDefault", () => {
  it("returns the default font when nextFont is unset", () => {
    const p = newVirtualPrinter();
    expect(p.getNextFontOrDefault().name).toBe("A");
  });

  it("returns the next font when set", () => {
    const p = newVirtualPrinter();
    p.nextFont = newFontInfo({ name: "Z", height: 30 });
    const out = p.getNextFontOrDefault();
    expect(out.name).toBe("Z");
    expect(out.height).toBe(30);
  });
});

describe("VirtualPrinter.getNextElementAlignmentOrDefault", () => {
  it("returns the default alignment when nextElementAlignment is unset", () => {
    const p = newVirtualPrinter();
    expect(p.getNextElementAlignmentOrDefault()).toBe(FieldAlignment.Left);
  });

  it("returns the override when set", () => {
    const p = newVirtualPrinter();
    p.nextElementAlignment = FieldAlignment.Right;
    expect(p.getNextElementAlignmentOrDefault()).toBe(FieldAlignment.Right);
  });
});

describe("VirtualPrinter.getReversePrint", () => {
  it("is true when either next-element or label reverse is set", () => {
    const p = newVirtualPrinter();
    expect(p.getReversePrint().value).toBe(false);

    p.nextElementFieldReverse = true;
    expect(p.getReversePrint().value).toBe(true);

    p.nextElementFieldReverse = false;
    p.labelReverse = true;
    expect(p.getReversePrint().value).toBe(true);
  });
});

describe("VirtualPrinter.getFieldInfo", () => {
  it("snapshots the next-element state with default barcode dimensions", () => {
    const p = newVirtualPrinter();
    p.currentCharset = 28;
    p.nextElementPosition = { x: 5, y: 9, calculateFromBottom: false, automaticPosition: false };
    p.nextElementFieldElement = { kind: "test" };

    const info = p.getFieldInfo();

    expect(info.currentCharset).toBe(28);
    expect(info.position).toEqual({
      x: 5,
      y: 9,
      calculateFromBottom: false,
      automaticPosition: false,
    });
    expect(info.element).toEqual({ kind: "test" });
    expect(info.alignment).toBe(FieldAlignment.Left);
    expect(info.font.name).toBe("A");
    expect(info.width).toBe(2);
    expect(info.widthRatio).toBe(3);
    expect(info.height).toBe(10);
    expect(info.reversePrint.value).toBe(false);
  });
});

describe("VirtualPrinter.resetFieldState", () => {
  it("clears all next-element state and leaves stored maps intact", () => {
    const p = newVirtualPrinter();

    // Populate next-element state.
    p.nextElementPosition = { x: 1, y: 2, calculateFromBottom: true, automaticPosition: true };
    p.nextElementFieldElement = { kind: "x" };
    p.nextElementFieldData = "data";
    p.nextElementFieldNumber = 7;
    p.nextElementAlignment = FieldAlignment.Right;
    p.nextFont = newFontInfo({ name: "B" });
    p.nextElementFieldReverse = true;
    p.nextHexEscapeChar = 0x5e;

    // Populate stored maps to confirm they survive the reset.
    p.storedGraphics.set("R:LOGO.GRF", { data: new Uint8Array([1]), totalBytes: 1, rowBytes: 1 });
    p.storedFormats.set("R:LBL.ZPL", { inverted: false, elements: [] });
    p.nextDownloadFormatName = "R:LBL.ZPL";
    p.labelInverted = true;

    p.resetFieldState();

    expect(p.nextElementPosition).toEqual({
      x: 0,
      y: 0,
      calculateFromBottom: false,
      automaticPosition: false,
    });
    expect(p.nextElementFieldElement).toBeNull();
    expect(p.nextElementFieldData).toBe("");
    expect(p.nextElementFieldNumber).toBe(-1);
    expect(p.nextElementAlignment).toBeNull();
    expect(p.nextFont).toBeNull();
    expect(p.nextElementFieldReverse).toBe(false);
    expect(p.nextHexEscapeChar).toBe(0);

    // Stored state and label-scope state are untouched.
    expect(p.storedGraphics.size).toBe(1);
    expect(p.storedFormats.size).toBe(1);
    expect(p.nextDownloadFormatName).toBe("R:LBL.ZPL");
    expect(p.labelInverted).toBe(true);
  });
});

describe("VirtualPrinter.resetLabelState", () => {
  it("clears nextDownloadFormatName and labelInverted only", () => {
    const p = newVirtualPrinter();
    p.nextDownloadFormatName = "R:LBL.ZPL";
    p.labelInverted = true;

    // Field state should not be reset by resetLabelState.
    p.nextElementFieldData = "still-here";
    p.nextElementFieldNumber = 42;

    p.resetLabelState();

    expect(p.nextDownloadFormatName).toBe("");
    expect(p.labelInverted).toBe(false);
    expect(p.nextElementFieldData).toBe("still-here");
    expect(p.nextElementFieldNumber).toBe(42);
  });
});
