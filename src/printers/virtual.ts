// Ported from internal/printers/virtual.go.
// Central state container that survives across ZPL commands within a print job.

import {
  type BarcodeDimensions,
  FieldAlignment,
  type FieldInfo,
  type FieldOrientation,
  type FontInfo,
  type LabelPosition,
  type ParsedFont,
  type ReversePrint,
  type StoredFormat,
  type StoredGraphics,
  newFontInfo,
  newLabelPosition,
} from "../elements/index.js";

export class VirtualPrinter {
  storedGraphics: Map<string, StoredGraphics> = new Map();
  storedFormats: Map<string, StoredFormat> = new Map();
  storedFonts: Map<string, ParsedFont> = new Map();
  storedFontAliases: Map<string, string> = new Map();
  labelHomePosition: LabelPosition = newLabelPosition();
  nextElementPosition: LabelPosition = newLabelPosition();
  defaultFont: FontInfo = newFontInfo({ name: "A" });
  defaultOrientation: FieldOrientation = 0;
  defaultAlignment: FieldAlignment = FieldAlignment.Left;
  nextElementAlignment: FieldAlignment | null = null;
  nextElementFieldElement: unknown = null;
  nextElementFieldData = "";
  nextElementFieldNumber = -1;
  nextFont: FontInfo | null = null;
  /** When non-empty, ZPL elements are parsed into this stored template instead of the output. */
  nextDownloadFormatName = "";
  /** Hex escape character for the next element; 0 means unset. Mirrors Go `byte`. */
  nextHexEscapeChar = 0;
  nextElementFieldReverse = false;
  labelReverse = false;
  defaultBarcodeDimensions: BarcodeDimensions = {
    moduleWidth: 2,
    height: 10,
    widthRatio: 3,
  };
  currentCharset = 0;
  printWidth = 0;
  labelInverted = false;

  setDefaultOrientation(orientation: FieldOrientation): void {
    this.defaultOrientation = orientation;
    this.defaultFont.orientation = orientation;
    if (this.nextFont !== null) {
      this.nextFont.orientation = orientation;
    }
  }

  getNextFontOrDefault(): FontInfo {
    return this.nextFont !== null ? { ...this.nextFont } : { ...this.defaultFont };
  }

  getNextElementAlignmentOrDefault(): FieldAlignment {
    return this.nextElementAlignment !== null ? this.nextElementAlignment : this.defaultAlignment;
  }

  getReversePrint(): ReversePrint {
    return { value: this.nextElementFieldReverse || this.labelReverse };
  }

  getFieldInfo(): FieldInfo {
    // Position is value-copied to match Go semantics: callers must not be able
    // to mutate printer state by writing to the returned FieldInfo.
    return {
      reversePrint: this.getReversePrint(),
      element: this.nextElementFieldElement,
      font: this.getNextFontOrDefault(),
      position: { ...this.nextElementPosition },
      alignment: this.getNextElementAlignmentOrDefault(),
      width: this.defaultBarcodeDimensions.moduleWidth,
      widthRatio: this.defaultBarcodeDimensions.widthRatio,
      height: this.defaultBarcodeDimensions.height,
      currentCharset: this.currentCharset,
    };
  }

  resetFieldState(): void {
    this.nextElementPosition = newLabelPosition();
    this.nextElementFieldElement = null;
    this.nextElementFieldData = "";
    this.nextElementFieldNumber = -1;
    this.nextElementAlignment = null;
    this.nextFont = null;
    this.nextElementFieldReverse = false;
    this.nextHexEscapeChar = 0;
  }

  resetLabelState(): void {
    this.nextDownloadFormatName = "";
    this.labelInverted = false;
  }
}

/** Factory mirroring Go's NewVirtualPrinter. */
export function newVirtualPrinter(): VirtualPrinter {
  return new VirtualPrinter();
}

// Free-function aliases — some parsers call these as standalone functions
// rather than methods (matching Go's package-level helper style).
export const setDefaultOrientation = (p: VirtualPrinter, o: FieldOrientation): void =>
  p.setDefaultOrientation(o);

export const resetFieldState = (p: VirtualPrinter): void => p.resetFieldState();
export const resetLabelState = (p: VirtualPrinter): void => p.resetLabelState();
export const getReversePrint = (p: VirtualPrinter) => p.getReversePrint();
export const getFieldInfo = (p: VirtualPrinter) => p.getFieldInfo();
export const getNextFontOrDefault = (p: VirtualPrinter) => p.getNextFontOrDefault();
export const getNextElementAlignmentOrDefault = (p: VirtualPrinter) =>
  p.getNextElementAlignmentOrDefault();
