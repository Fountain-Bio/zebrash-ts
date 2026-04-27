import { describe, expect, it } from "vitest";
import type { Barcode128 } from "./barcode_128.ts";
import { FieldAlignment } from "./field_alignment.ts";
import type { FieldInfo } from "./field_info.ts";
import { FieldOrientation } from "./field_orientation.ts";
import type { FontInfo } from "./font.ts";
import {
  type RecalledFieldData,
  RecalledFormat,
  type StoredField,
  type StoredFormat,
  newStoredFormat,
  storedFormatToRecalled,
} from "./stored_format.ts";
import type { TextField } from "./text_field.ts";

const font: FontInfo = {
  Name: "0",
  Width: 12,
  Height: 12,
  Orientation: FieldOrientation.Normal,
};

const fieldInfo = (overrides: Partial<FieldInfo> = {}): FieldInfo => ({
  ReversePrint: { Value: false },
  Element: null,
  Font: font,
  Position: { X: 1, Y: 2, CalculateFromBottom: false, AutomaticPosition: false },
  Alignment: FieldAlignment.Left,
  Width: 0,
  WidthRatio: 0,
  Height: 0,
  CurrentCharset: 0,
  ...overrides,
});

const storedField = (num: number, fi: FieldInfo): StoredField => ({
  _kind: "StoredField",
  Number: num,
  Field: fi,
});

const recalledFieldData = (num: number, data: string): RecalledFieldData => ({
  _kind: "RecalledFieldData",
  Number: num,
  Data: data,
});

describe("RecalledFormat", () => {
  it("populates field refs from later RecalledFieldData entries", () => {
    const rf = new RecalledFormat(false);
    rf.AddElement(storedField(1, fieldInfo()));
    rf.AddElement(
      storedField(
        2,
        fieldInfo({
          Position: { X: 9, Y: 9, CalculateFromBottom: false, AutomaticPosition: false },
        }),
      ),
    );
    rf.AddElement(recalledFieldData(1, "hello"));
    rf.AddElement(recalledFieldData(2, "world"));

    const out = rf.ResolveElements() as TextField[];
    expect(out).toHaveLength(2);
    expect(out[0]?._kind).toBe("TextField");
    expect(out[0]?.Text).toBe("hello");
    expect(out[1]?.Text).toBe("world");
    expect(out[1]?.Position.X).toBe(9);
  });

  it("RecalledFieldData arriving with no matching ref creates a standalone field", () => {
    const rf = new RecalledFormat(false);
    rf.AddElement(recalledFieldData(7, "lonely"));
    const out = rf.ResolveElements();
    // No backing FieldInfo + non-empty text returns a TextField via fallback.
    // Since field is undefined the resolver drops the entry (returns null in our port).
    expect(out).toHaveLength(0);
  });

  it("populating same number twice only fills the first batch", () => {
    const rf = new RecalledFormat(false);
    rf.AddElement(storedField(1, fieldInfo()));
    rf.AddElement(recalledFieldData(1, "first"));
    // After the first fill the refs map is cleared, so a second RFD adds a standalone (which is
    // dropped because there is no field).
    rf.AddElement(recalledFieldData(1, "second"));

    const out = rf.ResolveElements() as TextField[];
    expect(out).toHaveLength(1);
    expect(out[0]?.Text).toBe("first");
  });

  it("two stored fields with the same number both receive the same data", () => {
    const rf = new RecalledFormat(false);
    rf.AddElement(storedField(1, fieldInfo()));
    rf.AddElement(storedField(1, fieldInfo()));
    rf.AddElement(recalledFieldData(1, "shared"));

    const out = rf.ResolveElements() as TextField[];
    expect(out.map((t) => t.Text)).toEqual(["shared", "shared"]);
  });

  it("preserves non-StoredField/RecalledFieldData elements as-is", () => {
    const rf = new RecalledFormat(false);
    const passthrough = { _kind: "Other", value: 42 };
    rf.AddElement(passthrough);
    const out = rf.ResolveElements();
    expect(out).toEqual([passthrough]);
  });

  it("preserves Inverted from constructor", () => {
    expect(new RecalledFormat(true).Inverted).toBe(true);
  });

  it("resolves wrapped barcode element with field data", () => {
    const barcode: Barcode128 = {
      _kind: "Barcode128",
      Orientation: FieldOrientation.Normal,
      Height: 50,
      Line: true,
      LineAbove: false,
      CheckDigit: false,
      Mode: 0,
    };
    const rf = new RecalledFormat(false);
    rf.AddElement(storedField(3, fieldInfo({ Element: barcode, Width: 4 })));
    rf.AddElement(recalledFieldData(3, "1234567890"));

    const out = rf.ResolveElements();
    expect(out).toHaveLength(1);
    const item = out[0] as { _kind: string; Data: string; Width: number };
    expect(item._kind).toBe("Barcode128WithData");
    expect(item.Data).toBe("1234567890");
    expect(item.Width).toBe(4);
  });

  it("drops fields with no Element and no data", () => {
    const rf = new RecalledFormat(false);
    rf.AddElement(storedField(1, fieldInfo()));
    // No data ever arrives.
    const out = rf.ResolveElements();
    expect(out).toHaveLength(0);
  });
});

describe("StoredFormat", () => {
  it("storedFormatToRecalled replays Elements through AddElement", () => {
    const sf: StoredFormat = newStoredFormat(true, [
      storedField(1, fieldInfo()),
      recalledFieldData(1, "ok"),
    ]);
    const rf = storedFormatToRecalled(sf);
    expect(rf.Inverted).toBe(true);
    const out = rf.ResolveElements() as TextField[];
    expect(out[0]?.Text).toBe("ok");
  });
});
