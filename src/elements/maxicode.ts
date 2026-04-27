import type { LabelPosition } from "./label_position.ts";
import type { ReversePrint } from "./reverse_print.ts";

// ASCII control characters used by maxicode message structures.
const RS = "\x1e";
const GS = "\x1d";

export interface Maxicode {
  _kind: "Maxicode";
  // The mode to use to encode the bar code data.
  // Valid values: 2 (numeric postal code), 3 (alphanumeric postal code), 4 (standard),
  // 5 (full EEC), 6 (reader programming). Default 2.
  Mode: number;
}

export interface MaxicodeWithData {
  _kind: "MaxicodeWithData";
  ReversePrint: ReversePrint;
  Code: Maxicode;
  Position: LabelPosition;
  Data: string;
}

export function getMaxicodeInputData(barcode: MaxicodeWithData): string {
  const codeHeader = `[)>${RS}01${GS}`;
  const headerLen = 9;

  const data = barcode.Data;
  const headerPos = data.indexOf(codeHeader);

  if (headerPos < 0 || data.length < headerPos + headerLen) {
    throw new Error("invalid length of maxicode data");
  }

  const mainData = data.slice(0, headerPos);
  const addData = data.slice(headerPos);
  const headerData = addData.slice(0, headerLen);

  // ZPL commands have maxicode data as 2 separate sections:
  // - main data: class of service (3 chars), ship to country (3 chars), postal code
  // - additional data: everything else
  // Sections are separated by the special maxicode header. We combine them into one data string
  // before producing the maxicode.

  if (mainData.length < 7) {
    throw new Error("invalid length of maxicode main data");
  }

  const classOfService = mainData.slice(0, 3);
  const shipToCountry = mainData.slice(3, 6);
  const postalCode = mainData.slice(6);

  return addData.replaceAll(
    headerData,
    `${headerData}${postalCode}${GS}${shipToCountry}${GS}${classOfService}${GS}`,
  );
}
