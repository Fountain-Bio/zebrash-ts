import { describe, expect, it } from "vitest";

import type { Barcode128 } from "./barcode_128.ts";
import type { FieldInfo } from "./field_info.ts";
import type { FontInfo } from "./font.ts";
import type { TextField } from "./text_field.ts";

import { FieldAlignment } from "./field_alignment.ts";
import { FieldOrientation } from "./field_orientation.ts";
import {
  type RecalledFieldData,
  RecalledFormat,
  type StoredField,
  type StoredFormat,
  newStoredFormat,
  storedFormatToRecalled,
} from "./stored_format.ts";

const font: FontInfo = {
  name: "0",
  width: 12,
  height: 12,
  orientation: FieldOrientation.Normal,
};

const fieldInfo = (overrides: Partial<FieldInfo> = {}): FieldInfo => ({
  reversePrint: { value: false },
  element: null,
  font: font,
  position: { x: 1, y: 2, calculateFromBottom: false, automaticPosition: false },
  alignment: FieldAlignment.Left,
  width: 0,
  widthRatio: 0,
  height: 0,
  currentCharset: 0,
  ...overrides,
});

const storedField = (num: number, fi: FieldInfo): StoredField => ({
  _kind: "StoredField",
  number: num,
  field: fi,
});

const recalledFieldData = (num: number, data: string): RecalledFieldData => ({
  _kind: "RecalledFieldData",
  number: num,
  data: data,
});

describe("RecalledFormat", () => {
  it("populates field refs from later RecalledFieldData entries", () => {
    const rf = new RecalledFormat(false);
    rf.addElement(storedField(1, fieldInfo()));
    rf.addElement(
      storedField(
        2,
        fieldInfo({
          position: { x: 9, y: 9, calculateFromBottom: false, automaticPosition: false },
        }),
      ),
    );
    rf.addElement(recalledFieldData(1, "hello"));
    rf.addElement(recalledFieldData(2, "world"));

    const out = rf.resolveElements() as TextField[];
    expect(out).toHaveLength(2);
    expect(out[0]?._kind).toBe("TextField");
    expect(out[0]?.text).toBe("hello");
    expect(out[1]?.text).toBe("world");
    expect(out[1]?.position.x).toBe(9);
  });

  it("RecalledFieldData arriving with no matching ref creates a standalone field", () => {
    const rf = new RecalledFormat(false);
    rf.addElement(recalledFieldData(7, "lonely"));
    const out = rf.resolveElements();
    // No backing FieldInfo + non-empty text returns a TextField via fallback.
    // Since field is undefined the resolver drops the entry (returns null in our port).
    expect(out).toHaveLength(0);
  });

  it("populating same number twice only fills the first batch", () => {
    const rf = new RecalledFormat(false);
    rf.addElement(storedField(1, fieldInfo()));
    rf.addElement(recalledFieldData(1, "first"));
    // After the first fill the refs map is cleared, so a second RFD adds a standalone (which is
    // dropped because there is no field).
    rf.addElement(recalledFieldData(1, "second"));

    const out = rf.resolveElements() as TextField[];
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe("first");
  });

  it("two stored fields with the same number both receive the same data", () => {
    const rf = new RecalledFormat(false);
    rf.addElement(storedField(1, fieldInfo()));
    rf.addElement(storedField(1, fieldInfo()));
    rf.addElement(recalledFieldData(1, "shared"));

    const out = rf.resolveElements() as TextField[];
    expect(out.map((t) => t.text)).toEqual(["shared", "shared"]);
  });

  it("preserves non-StoredField/RecalledFieldData elements as-is", () => {
    const rf = new RecalledFormat(false);
    const passthrough = { _kind: "Other", value: 42 };
    rf.addElement(passthrough);
    const out = rf.resolveElements();
    expect(out).toEqual([passthrough]);
  });

  it("preserves Inverted from constructor", () => {
    expect(new RecalledFormat(true).inverted).toBe(true);
  });

  it("resolves wrapped barcode element with field data", () => {
    const barcode: Barcode128 = {
      _kind: "Barcode128",
      orientation: FieldOrientation.Normal,
      height: 50,
      line: true,
      lineAbove: false,
      checkDigit: false,
      mode: 0,
    };
    const rf = new RecalledFormat(false);
    rf.addElement(storedField(3, fieldInfo({ element: barcode, width: 4 })));
    rf.addElement(recalledFieldData(3, "1234567890"));

    const out = rf.resolveElements();
    expect(out).toHaveLength(1);
    const item = out[0] as { _kind: string; data: string; width: number };
    expect(item._kind).toBe("Barcode128WithData");
    expect(item.data).toBe("1234567890");
    expect(item.width).toBe(4);
  });

  it("drops fields with no Element and no data", () => {
    const rf = new RecalledFormat(false);
    rf.addElement(storedField(1, fieldInfo()));
    // No data ever arrives.
    const out = rf.resolveElements();
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
    expect(rf.inverted).toBe(true);
    const out = rf.resolveElements() as TextField[];
    expect(out[0]?.text).toBe("ok");
  });
});
