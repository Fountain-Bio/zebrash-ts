import { toUnicodeText } from "../encodings/index.ts";
import type { Barcode2of5, Barcode2of5WithData } from "./barcode_2of5.ts";
import type { Barcode39, Barcode39WithData } from "./barcode_39.ts";
import type { Barcode128, Barcode128WithData } from "./barcode_128.ts";
import type { BarcodeAztec, BarcodeAztecWithData } from "./barcode_aztec.ts";
import type { BarcodeDatamatrix, BarcodeDatamatrixWithData } from "./barcode_datamatrix.ts";
import type { BarcodeEan13, BarcodeEan13WithData } from "./barcode_ean13.ts";
import type { BarcodePdf417, BarcodePdf417WithData } from "./barcode_pdf417.ts";
import type { BarcodeQr, BarcodeQrWithData } from "./barcode_qr.ts";
import type { FieldBlock } from "./field_block.ts";
import type { FieldInfo } from "./field_info.ts";
import { fontWithAdjustedSizes } from "./font.ts";
import type { GraphicSymbol } from "./graphic_symbol.ts";
import type { Maxicode, MaxicodeWithData } from "./maxicode.ts";
import type { TextField } from "./text_field.ts";

export interface StoredField {
  _kind: "StoredField";
  Number: number;
  Field: FieldInfo;
}

export interface RecalledFieldData {
  _kind: "RecalledFieldData";
  Number: number;
  Data: string;
}

export interface RecalledField {
  _kind: "RecalledField";
  // Embeds StoredField — Number and Field are flat for parity with the Go layout.
  // Field is undefined when the recall arrived without a matching template.
  Number: number;
  Field: FieldInfo | undefined;
  Data: string;
}

export interface StoredFormat {
  Inverted: boolean;
  Elements: unknown[];
}

export function newStoredFormat(inverted: boolean, elements: unknown[]): StoredFormat {
  return { Inverted: inverted, Elements: elements };
}

export function storedFormatToRecalled(sf: StoredFormat): RecalledFormat {
  const res = new RecalledFormat(sf.Inverted);
  for (const el of sf.Elements) {
    res.AddElement(el);
  }
  return res;
}

export class RecalledFormat {
  Inverted: boolean;
  private elements: unknown[] = [];
  private fieldRefs = new Map<number, RecalledField[]>();

  constructor(inverted: boolean) {
    this.Inverted = inverted;
  }

  AddElement(element: unknown): boolean {
    if (isStoredField(element)) {
      // Convert field to recalled so it can be populated with data.
      const field: RecalledField = {
        _kind: "RecalledField",
        Number: element.Number,
        Field: element.Field,
        Data: "",
      };

      this.elements.push(field);
      const existing = this.fieldRefs.get(field.Number) ?? [];
      existing.push(field);
      this.fieldRefs.set(field.Number, existing);
      return true;
    }

    if (isRecalledFieldData(element)) {
      const refs = this.fieldRefs.get(element.Number);
      if (refs !== undefined) {
        for (const ref of refs) {
          ref.Data = element.Data;
        }
        this.fieldRefs.delete(element.Number);
      } else {
        // No template waiting for this number — add a standalone RecalledField with no Field.
        const orphan: RecalledField = {
          _kind: "RecalledField",
          Number: 0,
          Field: undefined,
          Data: element.Data,
        };
        this.elements.push(orphan);
      }
      return true;
    }

    this.elements.push(element);
    return true;
  }

  ResolveElements(): unknown[] {
    const res: unknown[] = [];

    for (const element of this.elements) {
      if (isRecalledField(element)) {
        const re = resolveRecalledField(element);
        if (re !== null) {
          res.push(re);
        }
      } else {
        res.push(element);
      }
    }

    return res;
  }
}

function getKind(v: unknown): string | undefined {
  if (typeof v === "object" && v !== null) {
    const k = (v as { _kind?: unknown })._kind;
    return typeof k === "string" ? k : undefined;
  }
  return undefined;
}

const isStoredField = (v: unknown): v is StoredField => getKind(v) === "StoredField";
const isRecalledField = (v: unknown): v is RecalledField => getKind(v) === "RecalledField";
const isRecalledFieldData = (v: unknown): v is RecalledFieldData =>
  getKind(v) === "RecalledFieldData";

function resolveRecalledField(f: RecalledField): unknown {
  const field = f.Field;
  const text = f.Data;

  if (field === undefined) {
    return null;
  }
  if (field.Element == null && text === "") {
    return null;
  }

  const { ReversePrint, Position, Width, WidthRatio, Height } = field;

  switch (getKind(field.Element)) {
    case "Maxicode": {
      const res: MaxicodeWithData = {
        _kind: "MaxicodeWithData",
        ReversePrint,
        Code: field.Element as Maxicode,
        Position,
        Data: text,
      };
      return res;
    }
    case "BarcodePdf417": {
      const res: BarcodePdf417WithData = {
        ...(field.Element as BarcodePdf417),
        _kind: "BarcodePdf417WithData",
        ReversePrint,
        Position,
        Data: text,
      };
      return res;
    }
    case "Barcode128": {
      const res: Barcode128WithData = {
        ...(field.Element as Barcode128),
        _kind: "Barcode128WithData",
        ReversePrint,
        Width,
        Position,
        Data: text,
      };
      return res;
    }
    case "BarcodeEan13": {
      const res: BarcodeEan13WithData = {
        ...(field.Element as BarcodeEan13),
        _kind: "BarcodeEan13WithData",
        ReversePrint,
        Width,
        Position,
        Data: text,
      };
      return res;
    }
    case "Barcode2of5": {
      const res: Barcode2of5WithData = {
        ...(field.Element as Barcode2of5),
        _kind: "Barcode2of5WithData",
        ReversePrint,
        Width,
        WidthRatio,
        Position,
        Data: text,
      };
      return res;
    }
    case "Barcode39": {
      const res: Barcode39WithData = {
        ...(field.Element as Barcode39),
        _kind: "Barcode39WithData",
        ReversePrint,
        Width,
        WidthRatio,
        Position,
        Data: text,
      };
      return res;
    }
    case "BarcodeAztec": {
      const res: BarcodeAztecWithData = {
        ...(field.Element as BarcodeAztec),
        _kind: "BarcodeAztecWithData",
        ReversePrint,
        Position,
        Data: text,
      };
      return res;
    }
    case "BarcodeDatamatrix": {
      const res: BarcodeDatamatrixWithData = {
        ...(field.Element as BarcodeDatamatrix),
        _kind: "BarcodeDatamatrixWithData",
        ReversePrint,
        Position,
        Data: text,
      };
      return res;
    }
    case "BarcodeQr": {
      const res: BarcodeQrWithData = {
        ...(field.Element as BarcodeQr),
        _kind: "BarcodeQrWithData",
        ReversePrint,
        Height,
        Position,
        Data: text,
      };
      return res;
    }
    case "GraphicSymbol":
      return toGraphicSymbolTextField(text, field, field.Element as GraphicSymbol);
    case "FieldBlock":
      return toTextField(text, field, field.Element as FieldBlock);
    default:
      return toTextField(text, field, undefined);
  }
}

function toGraphicSymbolTextField(
  text: string,
  field: FieldInfo,
  fe: GraphicSymbol,
): TextField | null {
  const out = toGSText(text);
  if (out === "") {
    return null;
  }

  return {
    _kind: "TextField",
    Font: fontWithAdjustedSizes({
      Name: "GS",
      Width: fe.Width,
      Height: fe.Height,
      Orientation: fe.Orientation,
    }),
    Position: field.Position,
    Alignment: field.Alignment,
    Text: out,
    ReversePrint: field.ReversePrint,
  };
}

function toGSText(text: string): string {
  let res = "";
  for (const r of text) {
    // Keep leading spaces
    if (r === " ") {
      res += r;
      continue;
    }

    if (r >= "A" && r <= "E") {
      res += r;
    }

    // We stop after the first non-space character.
    break;
  }
  return res;
}

function toTextField(text: string, field: FieldInfo, fe: FieldBlock | undefined): TextField {
  // \& = carriage return/line feed
  const unicodeText = toUnicodeText(text.replaceAll("\\&", "\n"), field.CurrentCharset);

  return {
    _kind: "TextField",
    Font: fontWithAdjustedSizes(field.Font),
    Position: field.Position,
    Alignment: field.Alignment,
    Text: unicodeText,
    Block: fe,
    ReversePrint: field.ReversePrint,
  };
}
