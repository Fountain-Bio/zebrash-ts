// RuneToInt converts a rune (code point) between '0' and '9' to an integer between 0 and 9.
// If the rune is outside of this range -1 is returned.
export function runeToInt(r: number): number {
  if (r >= 0x30 /* '0' */ && r <= 0x39 /* '9' */) {
    return r - 0x30;
  }
  return -1;
}

// IntToRune converts a digit 0 - 9 to the rune '0' - '9'. If the given int is outside
// of this range 'F' is returned!
export function intToRune(i: number): number {
  if (i >= 0 && i <= 9) {
    return i + 0x30;
  }
  return 0x46; /* 'F' */
}
