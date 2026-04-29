import { describe, expect, it } from "vitest";

import { intToRune, runeToInt } from "./runeint.ts";

describe("runeToInt", () => {
  it("maps '0'..'9' to 0..9", () => {
    for (let i = 0; i < 10; i++) {
      expect(runeToInt("0".charCodeAt(0) + i)).toBe(i);
    }
  });

  it("returns -1 for non-digit code points", () => {
    expect(runeToInt("a".charCodeAt(0))).toBe(-1);
    expect(runeToInt("/".charCodeAt(0))).toBe(-1);
    expect(runeToInt(":".charCodeAt(0))).toBe(-1);
    expect(runeToInt(0)).toBe(-1);
  });
});

describe("intToRune", () => {
  it("maps 0..9 to '0'..'9'", () => {
    for (let i = 0; i < 10; i++) {
      expect(intToRune(i)).toBe("0".charCodeAt(0) + i);
    }
  });

  it("returns 'F' for out-of-range values", () => {
    expect(intToRune(-1)).toBe("F".charCodeAt(0));
    expect(intToRune(10)).toBe("F".charCodeAt(0));
    expect(intToRune(100)).toBe("F".charCodeAt(0));
  });
});
