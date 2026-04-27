import { describe, expect, it } from "vitest";
import { type MaxicodeWithData, getMaxicodeInputData } from "./maxicode.ts";

const RS = "\x1e";
const GS = "\x1d";
const HEADER = `[)>${RS}01${GS}`;

const wrap = (data: string): MaxicodeWithData => ({
  _kind: "MaxicodeWithData",
  reversePrint: { value: false },
  code: { _kind: "Maxicode", mode: 4 },
  position: { x: 0, y: 0, calculateFromBottom: false, automaticPosition: false },
  data: data,
});

// The Maxicode SCM "header" is the 7-character envelope `[)>${RS}01${GS}` plus the 2-character
// year/mode code that follows it (total 9 chars). The transformer preserves those 9 prefix bytes
// verbatim and inserts postal/country/class fields immediately after.
describe("getMaxicodeInputData", () => {
  it("rearranges class/country/postal after the 9-byte SCM header", () => {
    const classOfService = "999";
    const shipToCountry = "840";
    const postalCode = "12345";
    const yearCode = "96";
    const tail = "PAYLOAD";

    const input = `${classOfService}${shipToCountry}${postalCode}${HEADER}${yearCode}${tail}`;
    const expected = `${HEADER}${yearCode}${postalCode}${GS}${shipToCountry}${GS}${classOfService}${GS}${tail}`;

    expect(getMaxicodeInputData(wrap(input))).toBe(expected);
  });

  it("throws when the maxicode header is missing", () => {
    expect(() => getMaxicodeInputData(wrap("no-header-here"))).toThrow(
      "invalid length of maxicode data",
    );
  });

  it("throws when there are not enough bytes after the header for the 2-byte year code", () => {
    // header found, but only 1 char follows it, so addData length < headerLen=9.
    const input = `999840${HEADER}9`;
    expect(() => getMaxicodeInputData(wrap(input))).toThrow("invalid length of maxicode data");
  });

  it("throws when main data is shorter than 7 characters", () => {
    const input = `12345${HEADER}96rest`;
    expect(() => getMaxicodeInputData(wrap(input))).toThrow("invalid length of maxicode main data");
  });

  it("supports a multi-character postal code", () => {
    const classOfService = "001";
    const shipToCountry = "056";
    const postalCode = "AB12CD3";
    const yearCode = "04";
    const tail = "TAIL";

    const input = `${classOfService}${shipToCountry}${postalCode}${HEADER}${yearCode}${tail}`;
    const expected = `${HEADER}${yearCode}${postalCode}${GS}${shipToCountry}${GS}${classOfService}${GS}${tail}`;

    expect(getMaxicodeInputData(wrap(input))).toBe(expected);
  });
});
