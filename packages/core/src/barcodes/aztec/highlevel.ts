import { BitList } from "../utils/index.js";
import { Mode, type State, charMap, initialState, shiftTable } from "./state.js";

/**
 * High-level Aztec encoding. The encoder considers every possible mode-switch
 * sequence and keeps only the Pareto-optimal ones (cheapest in bits for each
 * (mode, binary-shift) configuration). The cheapest final state wins.
 */
export function highlevelEncode(data: Uint8Array): BitList {
  let states: State[] = [initialState];

  for (let index = 0; index < data.length; index++) {
    let pairCode = 0;
    const cur = data[index] ?? 0;
    const next = index + 1 < data.length ? (data[index + 1] ?? 0) : 0;

    if (cur === 0x0d /* \r */ && next === 0x0a /* \n */) {
      pairCode = 2;
    } else if (cur === 0x2e /* . */ && next === 0x20) {
      pairCode = 3;
    } else if (cur === 0x2c /* , */ && next === 0x20) {
      pairCode = 4;
    } else if (cur === 0x3a /* : */ && next === 0x20) {
      pairCode = 5;
    }
    if (pairCode > 0) {
      // One of the four PUNCT pairs — encode atomically and skip ahead.
      states = updateStateListForPair(states, index, pairCode);
      index++;
    } else {
      states = updateStateListForChar(states, data, index);
    }
  }

  let result: State | null = null;
  let minBitCnt = Number.MAX_SAFE_INTEGER;
  for (const s of states) {
    if (s.bitCount < minBitCnt) {
      minBitCnt = s.bitCount;
      result = s;
    }
  }
  return result !== null ? result.toBitList(data) : new BitList();
}

/** Drop dominated states from `states` (Pareto pruning). */
export function simplifyStates(states: State[]): State[] {
  let result: State[] = [];
  for (const newState of states) {
    let add = true;
    const newResult: State[] = [];
    for (const oldState of result) {
      if (add && oldState.isBetterThanOrEqualTo(newState)) {
        add = false;
      }
      if (!(add && newState.isBetterThanOrEqualTo(oldState))) {
        newResult.push(oldState);
      }
    }
    if (add) {
      newResult.push(newState);
      result = newResult;
    } else {
      result = newResult;
    }
  }
  return result;
}

export function updateStateListForChar(states: State[], data: Uint8Array, index: number): State[] {
  const result: State[] = [];
  for (const s of states) {
    const r = updateStateForChar(s, data, index);
    if (r.length > 0) {
      result.push(...r);
    }
  }
  return simplifyStates(result);
}

/**
 * Generate every plausible follow-on state for `s` after consuming `data[index]`.
 *
 * For each mode the character is reachable in we consider:
 *   1. latching to that mode (mandatory if not already, optional otherwise)
 *   2. shifting to that mode (when a shift code exists from the current mode)
 *   3. emitting the character via Binary Shift (only if useful)
 */
function updateStateForChar(s: State, data: Uint8Array, index: number): State[] {
  const result: State[] = [];
  const ch = data[index] ?? 0;
  const charInCurrentTable = (charMap[s.mode]?.[ch] ?? 0) > 0;

  let stateNoBinary: State | null = null;
  for (let mode: Mode = Mode.Upper; mode <= Mode.Punct; mode = (mode + 1) as Mode) {
    const charInMode = charMap[mode]?.[ch] ?? 0;
    if (charInMode > 0) {
      if (stateNoBinary === null) {
        stateNoBinary = s.endBinaryShift(index);
      }

      // Try latching to this character's mode.
      if (mode === s.mode) {
        // Already in the right mode — no latch needed.
        result.push(stateNoBinary.latchAndAppend(mode, charInMode));
      } else if (!charInCurrentTable) {
        // Character isn't in the current table; we *must* latch.
        result.push(stateNoBinary.latchAndAppend(mode, charInMode));
      }

      // Shifting only helps when the character isn't already reachable in
      // the current mode (otherwise just emitting it is strictly cheaper).
      const shiftBits = shiftTable[s.mode]?.[mode];
      if (!charInCurrentTable && shiftBits !== null && shiftBits !== undefined) {
        result.push(stateNoBinary.shiftAndAppend(mode, charInMode));
      }
    }
  }

  // Binary-shift fallback: only useful if we're already in a binary run, or
  // if the character isn't representable in the current mode at all.
  if (s.bShiftByteCount > 0 || (charMap[s.mode]?.[ch] ?? 0) === 0) {
    result.push(s.addBinaryShiftChar(index));
  }
  return result;
}

export function updateStateListForPair(states: State[], index: number, pairCode: number): State[] {
  const result: State[] = [];
  for (const s of states) {
    const r = updateStateForPair(s, index, pairCode);
    if (r.length > 0) {
      result.push(...r);
    }
  }
  return simplifyStates(result);
}

function updateStateForPair(s: State, index: number, pairCode: number): State[] {
  const result: State[] = [];
  const stateNoBinary = s.endBinaryShift(index);
  // 1. Latch to PUNCT and emit the pair code.
  result.push(stateNoBinary.latchAndAppend(Mode.Punct, pairCode));
  if (s.mode !== Mode.Punct) {
    // 2. Shift to PUNCT and emit the pair code.
    result.push(stateNoBinary.shiftAndAppend(Mode.Punct, pairCode));
  }
  if (pairCode === 3 || pairCode === 4) {
    // ". " or ", ": both characters live in DIGIT, so two digit codes can
    // sometimes beat the punct pair.
    const digitState = stateNoBinary
      .latchAndAppend(Mode.Digit, 16 - pairCode) // '.' or ',' in DIGIT
      .latchAndAppend(Mode.Digit, 1); // space in DIGIT
    result.push(digitState);
  }
  if (s.bShiftByteCount > 0) {
    // Already mid-binary-shift: emit both characters as raw bytes.
    result.push(s.addBinaryShiftChar(index).addBinaryShiftChar(index + 1));
  }
  return result;
}
