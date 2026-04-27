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
  number: number;
  field: FieldInfo;
}

export interface RecalledFieldData {
  _kind: "RecalledFieldData";
  number: number;
  data: string;
}

export interface RecalledField {
  _kind: "RecalledField";
  // Embeds StoredField — Number and Field are flat for parity with the Go layout.
  // Field is undefined when the recall arrived without a matching template.
  number: number;
  field: FieldInfo | undefined;
  data: string;
}

export interface StoredFormat {
  inverted: boolean;
  elements: unknown[];
}

export function newStoredFormat(inverted: boolean, elements: unknown[]): StoredFormat {
  return { inverted: inverted, elements: elements };
}

export function storedFormatToRecalled(sf: StoredFormat): RecalledFormat {
  const res = new RecalledFormat(sf.inverted);
  for (const el of sf.elements) {
    res.addElement(el);
  }
  return res;
}

export class RecalledFormat {
  inverted: boolean;
  private elements: unknown[] = [];
  private fieldRefs = new Map<number, RecalledField[]>();

  constructor(inverted: boolean) {
    this.inverted = inverted;
  }

  addElement(element: unknown): boolean {
    if (isStoredField(element)) {
      // Convert field to recalled so it can be populated with data.
      const field: RecalledField = {
        _kind: "RecalledField",
        number: element.number,
        field: element.field,
        data: "",
      };

      this.elements.push(field);
      const existing = this.fieldRefs.get(field.number) ?? [];
      existing.push(field);
      this.fieldRefs.set(field.number, existing);
      return true;
    }

    if (isRecalledFieldData(element)) {
      const refs = this.fieldRefs.get(element.number);
      if (refs !== undefined) {
        for (const ref of refs) {
          ref.data = element.data;
        }
        this.fieldRefs.delete(element.number);
      } else {
        // No template waiting for this number — add a standalone RecalledField with no Field.
        const orphan: RecalledField = {
          _kind: "RecalledField",
          number: 0,
          field: undefined,
          data: element.data,
        };
        this.elements.push(orphan);
      }
      return true;
    }

    this.elements.push(element);
    return true;
  }

  resolveElements(): unknown[] {
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
  const field = f.field;
  const text = f.data;

  if (field === undefined) {
    return null;
  }
  if (field.element == null && text === "") {
    return null;
  }

  const { reversePrint, position, width, widthRatio, height } = field;

  switch (getKind(field.element)) {
    case "Maxicode": {
      const res: MaxicodeWithData = {
        _kind: "MaxicodeWithData",
        reversePrint,
        code: field.element as Maxicode,
        position,
        data: text,
      };
      return res;
    }
    case "BarcodePdf417": {
      const res: BarcodePdf417WithData = {
        ...(field.element as BarcodePdf417),
        _kind: "BarcodePdf417WithData",
        reversePrint,
        position,
        data: text,
      };
      return res;
    }
    case "Barcode128": {
      const res: Barcode128WithData = {
        ...(field.element as Barcode128),
        _kind: "Barcode128WithData",
        reversePrint,
        width,
        position,
        data: text,
      };
      return res;
    }
    case "BarcodeEan13": {
      const res: BarcodeEan13WithData = {
        ...(field.element as BarcodeEan13),
        _kind: "BarcodeEan13WithData",
        reversePrint,
        width,
        position,
        data: text,
      };
      return res;
    }
    case "Barcode2of5": {
      const res: Barcode2of5WithData = {
        ...(field.element as Barcode2of5),
        _kind: "Barcode2of5WithData",
        reversePrint,
        width,
        widthRatio,
        position,
        data: text,
      };
      return res;
    }
    case "Barcode39": {
      const res: Barcode39WithData = {
        ...(field.element as Barcode39),
        _kind: "Barcode39WithData",
        reversePrint,
        width,
        widthRatio,
        position,
        data: text,
      };
      return res;
    }
    case "BarcodeAztec": {
      const res: BarcodeAztecWithData = {
        ...(field.element as BarcodeAztec),
        _kind: "BarcodeAztecWithData",
        reversePrint,
        position,
        data: text,
      };
      return res;
    }
    case "BarcodeDatamatrix": {
      const res: BarcodeDatamatrixWithData = {
        ...(field.element as BarcodeDatamatrix),
        _kind: "BarcodeDatamatrixWithData",
        reversePrint,
        position,
        data: text,
      };
      return res;
    }
    case "BarcodeQr": {
      const res: BarcodeQrWithData = {
        ...(field.element as BarcodeQr),
        _kind: "BarcodeQrWithData",
        reversePrint,
        height,
        position,
        data: text,
      };
      return res;
    }
    case "GraphicSymbol":
      return toGraphicSymbolTextField(text, field, field.element as GraphicSymbol);
    case "FieldBlock":
      return toTextField(text, field, field.element as FieldBlock);
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
    font: fontWithAdjustedSizes({
      name: "GS",
      width: fe.width,
      height: fe.height,
      orientation: fe.orientation,
    }),
    position: field.position,
    alignment: field.alignment,
    text: out,
    reversePrint: field.reversePrint,
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
  const unicodeText = toUnicodeText(text.replaceAll("\\&", "\n"), field.currentCharset);

  return {
    _kind: "TextField",
    font: fontWithAdjustedSizes(field.font),
    position: field.position,
    alignment: field.alignment,
    text: unicodeText,
    block: fe,
    reversePrint: field.reversePrint,
  };
}
