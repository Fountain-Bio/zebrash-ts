// Port of bitlist_widenarrow.go — wide/narrow bar encoding (Code 39, 2of5).

import type { BitList } from "./bitlist.ts";

// One entry in a WideNarrowList: [isWide, isOn].
export type WideNarrowBar = readonly [boolean, boolean];

export class WideNarrowList {
  // Each entry is [wide?, on?]; mirrors Go's [][2]bool.
  data: WideNarrowBar[];
  private narrowBarWidth: number;
  private wideBarWidth: number;

  constructor(data: WideNarrowBar[], wideBarWidth: number, narrowBarWidth: number) {
    this.data = data;
    this.wideBarWidth = wideBarWidth;
    this.narrowBarWidth = narrowBarWidth;
  }

  // Sum of all bar widths (clamped to at least 1).
  getTotalWidth(): number {
    let width = 0;
    for (let i = 0; i < this.data.length; i++) {
      width += this.getBarWidth(i);
    }
    return Math.max(1, width);
  }

  getBarWidth(idx: number): number {
    return this.data[idx]![0] ? this.wideBarWidth : this.narrowBarWidth;
  }
}

// Converts a BitList to a useful representation for barcodes that have narrow / wide bars
// with a variable bar ratio.
export function toWideNarrowList(
  bits: BitList,
  wideBarWidth: number,
  narrowBarWidth: number,
): WideNarrowList {
  const res: WideNarrowBar[] = [];
  if (bits.len() === 0) {
    return new WideNarrowList(res, wideBarWidth, narrowBarWidth);
  }

  let prevB = bits.getBit(0);
  let c = 0;
  for (let i = 0; i < bits.len(); i++) {
    const b = bits.getBit(i);
    if (prevB === b) {
      c++;
      continue;
    }
    res.push([c > 1, prevB]);
    prevB = b;
    c = 1;
  }
  res.push([c > 1, prevB]);
  return new WideNarrowList(res, wideBarWidth, narrowBarWidth);
}
