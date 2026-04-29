---
title: "ZPL charset 28 (UTF-8) silently bypassed when input is hex-escaped Latin-1 round-trip"
date: 2026-04-28
category: docs/solutions/ui-bugs
module: encodings
problem_type: ui_bug
component: tooling
severity: high
symptoms:
  - "Turkish text on dhlecommercetr fixture renders as mojibake — 'ELMABAHÇESİ' shown as 'ELMABAHÃESÄ°', 'İSTANBUL H.' as 'A°STANBUL H.', 'GAZİOSMANPAŞA' as 'GAZÄ°OSMANPAŞA'"
  - "'HALLEDERSİNİZ MEDYA LİMİTED ŞİRKETİ' renders as 'HALLEDERSÄ°NÄ°Z MEDYA LÄ°MÄ°TED ŞİRKETÄ°'"
  - "Non-printable C1 control U+0087 appears between glyphs (lone trailing byte from a broken-up 2-byte UTF-8 sequence)"
  - "Bug is symmetric across Node and browser — the fault is upstream of the canvas, in toUnicodeText"
  - "Only triggered by the ^CI28 + ^FH combination; raw UTF-8 in plain ^FD payloads worked because the parser-level TextDecoder already decoded them"
root_cause: wrong_api
resolution_type: code_fix
related_components:
  - hex-escape
  - field-data
  - text-rendering
tags:
  - utf-8
  - encodings
  - mojibake
  - turkish
  - ci28
  - hex-escape
  - text-decoder
  - charset
---

# ZPL charset 28 (UTF-8) silently bypassed when input is hex-escaped Latin-1 round-trip

## Problem

ZPL fixtures combining `^CI28` (UTF-8) with `^FH` (hex escape) rendered Turkish (and any multi-byte UTF-8) characters as mojibake — `ELMABAHÇESİ` came out as `ELMABAHÃESÄ°` in the `dhlecommercetr` golden test and the browser viewer. Every non-ASCII glyph routed through the hex-escape decoder displayed as two Latin-1 characters per intended codepoint.

## Symptoms

- `dhlecommercetr` fixture rendered with visible mojibake on every Turkish glyph (`Ç`, `İ`, `Ş`, `Ğ`, …).
- Lone C1 control character `U+0087` interspersed between glyphs (the trailing byte of broken-up 2-byte UTF-8 sequences).
- Pixel-diff against the Go reference PNG was dramatically higher than the 5% golden threshold for affected text regions.
- Symmetric across Node and browser — the fault was in the encoding layer, not the renderer.
- Only the `^CI28` + `^FH` combination triggered it. Plain `^FD` UTF-8 payloads worked because the parser-level `TextDecoder` at `src/parser.ts:37` had already converted bytes to real Unicode strings up front.

## What Didn't Work

- **False lead — the stray `>:` text in the upper-left.** The .zpl source contains literal `>:` bytes; the rendering looked like a JS escape leak. Reading `test/fixtures/dhlecommercetr.png` inline confirmed Go renders the same `>:` characters: it's the human-readable interpretation line of a Code 128 barcode whose payload is the eight bytes `>:`. **Worth flagging — the next engineer looking at this fixture will see the same string and chase the same red herring.**
- **Fixing inside `decodeEscapedString`** (`src/hex/decode.ts`). Rejected: the hex decoder runs before `^FS` resolves the field, so it has no knowledge of the active charset. Hex-escape semantics are charset-agnostic by design (Go works the same way).
- **Always running UTF-8 decode on charset-28 input.** Rejected: non-hex `^FD` paths arrive already-Unicode-decoded from the parser-level `TextDecoder("utf-8")` at `src/parser.ts:37`. Re-decoding a single-codepoint character like `Ç` (`U+00C7`) would treat `0xC7` as a lone (invalid) UTF-8 lead byte and corrupt it.
- **Adding charset 28 as a no-op (mirroring Go).** That's exactly what the code already did at `src/encodings/decode.ts:42`. Go gets away with it because Go strings are byte sequences and FreeType consumes them as such; JS strings are UTF-16 code units, so the byte-level identity Go relies on doesn't translate.

## Solution

Add a charset-28 branch to `toUnicodeText` that detects Latin-1-round-tripped UTF-8 bytes and decodes them with `TextDecoder` in `fatal: true` mode. Already-Unicode strings (codepoints > 0xff, or invalid as UTF-8) pass through unchanged.

**Before** (`src/encodings/decode.ts`):

```ts
export function toUnicodeText(text: string, charset: number): string {
  if (charset >= 0 && charset <= 13) {
    /* …CP850 + remaps… */
  }
  if (charset === 27) {
    return new TextDecoder("windows-1252").decode(stringToBytes(text));
  }
  return text; // charset 28 (UTF-8) and unknowns fall through unchanged
}
```

**After**:

```ts
if (charset === 27) {
  return new TextDecoder("windows-1252").decode(stringToBytes(text));
}

if (charset === 28) {
  return decodeUtf8IfBytes(text);
}

return text;

const utf8Strict = new TextDecoder("utf-8", { fatal: true });

function decodeUtf8IfBytes(text: string): string {
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) > 0xff) return text;
  }
  try {
    return utf8Strict.decode(stringToBytes(text));
  } catch {
    return text;
  }
}
```

The strict decoder is hoisted to module scope so we don't allocate a new `TextDecoder` per call.

Plus three unit tests in `src/encodings/decode.test.ts` covering each branch of `decodeUtf8IfBytes`:

```ts
it("decodes charset 28 as UTF-8 when bytes round-tripped through hex escape", () => {
  const text = bytesAsString([
    0x45, 0x4c, 0x4d, 0x41, 0x42, 0x41, 0x48, 0xc3, 0x87, 0x45, 0x53, 0xc4, 0xb0,
  ]);
  expect(toUnicodeText(text, 28)).toBe("ELMABAHÇESİ");
});

it("passes already-decoded Unicode through unchanged for charset 28", () => {
  // Lone 0xC7 byte is invalid UTF-8 → must not be re-decoded.
  expect(toUnicodeText("Çé", 28)).toBe("Çé");
});

it("short-circuits when any code unit is > 0xff for charset 28", () => {
  // 'İ' is U+0130 — can't be a single Latin-1 byte, skip the decode.
  expect(toUnicodeText("İ", 28)).toBe("İ");
});
```

Verification: `dhlecommercetr` golden dropped from heavy mojibake to **0.34% pixel diff** (Node) and **0.25% pixel / 1.17% ink delta** (browser). All 513 tests pass.

## Why This Works

This is a structural Go-vs-JS string-model mismatch.

In Go, `string` is an immutable byte sequence. After `splitZplCommands` reads the `.zpl` file and `decodeEscapedString` substitutes hex escapes, the resulting `string` holds raw UTF-8 bytes. FreeType consumes those bytes directly — UTF-8 "just works" because no decoding ever happened.

In JS, `string` is a UTF-16 code-unit sequence. `decodeEscapedString` (`src/hex/decode.ts:11-14`) performs a Latin-1 round-trip: each escaped byte becomes a code unit numerically equal to the byte. So `_C3_87` (the UTF-8 encoding of `Ç`) becomes the JS string `"Ã"` — two separate code units. Canvas renders each as its own glyph: `Ã` followed by the C1 control `U+0087`.

The non-hex path doesn't have this problem because `src/parser.ts:37` does `new TextDecoder("utf-8").decode(zplData)` on raw input bytes, producing real Unicode strings up front. Hex escapes intentionally bypass that decode (they need byte-exact substitution before the charset is even known).

`fatal: true` is the load-bearing detail in the fix. It distinguishes:

- **Latin-1-round-tripped UTF-8 bytes** (e.g. `0xC3 0x87`) — form a valid UTF-8 sequence, decode succeeds, produces `Ç`.
- **Already-decoded Unicode** (e.g. lone `0xC7` for `Ç` arriving from the parser-level decoder) — invalid as UTF-8 (lone lead byte), `TextDecoder` throws, fallback returns the input unchanged.

The `> 0xff` short-circuit handles strings containing codepoints that can't be a single byte at all (e.g. `İ` = `U+0130`) — definitely not a Latin-1 byte buffer, so skip the decode attempt.

Cross-references:

- `src/encodings/decode.ts:42` — original no-op return for charset 28
- `src/hex/decode.ts:11-14` — docstring on the Latin-1 round-trip semantics of `decodeEscapedString`
- `src/parser.ts:37` — parser-level `TextDecoder("utf-8")` for raw byte input
- `src/elements/stored_format.ts:312` — call site: `toUnicodeText(text.replaceAll("\\&", "\n"), field.currentCharset)`
- `../zebrash/internal/encodings/decode.go:30` — Go reference, also a no-op for charset 28 (correct in Go, broken when ported literally to JS)

## Prevention

**Test pattern.** When adding any charset to `toUnicodeText`, include both halves of the dual-input invariant:

```ts
it("decodes charset N when bytes round-tripped through hex escape", () => {
  const bytes = bytesAsString([/* raw bytes for the target charset */]);
  expect(toUnicodeText(bytes, N)).toBe(/* expected Unicode */);
});

it("passes already-decoded Unicode through unchanged for charset N", () => {
  expect(toUnicodeText(/* lone-high-byte Unicode */, N)).toBe(/* same */);
});
```

The two-test pair (round-tripped bytes + already-decoded passthrough) is the minimum to lock in correctness against both call paths.

**General principle when porting Go to TS.** Whenever you encounter a Go path that treats `string` as bytes — encoding/decoding, network IO, hex/base64 substitution, byte-level slicing, `[]byte(s)` round-trips, `len(s)` on user data — flag it. The Go code "looks correct" because `string` and `[]byte` interconvert losslessly. In TS, a JS `string` is UTF-16 code units; treating it as bytes silently breaks any non-ASCII data. Audit hotspots: `src/hex/decode.ts`, `src/encodings/decode.ts`, anywhere `String.fromCharCode` or `charCodeAt` bridges bytes ↔ string, anywhere a `Uint8Array` is `.toString()`'d.

**Future work — charsets 29 and 30.** ZPL `^CI29` is UTF-16 BE and `^CI30` is UTF-16 LE. Neither is currently handled (both fall through to unchanged-text). The Go reference also doesn't handle them, so this is parity-correct today. When a fixture exercises them, the fix is structurally identical: detect Latin-1-round-tripped bytes and decode with `TextDecoder("utf-16be")` or `TextDecoder("utf-16le")` under `fatal: true`. **Not a current bug — flag as future work.**

**Future work — branded `ByteString` type.** `stringToBytes` and the charset-28 branch rely on the load-bearing convention that "this `string` is actually a Latin-1-round-tripped byte buffer." That invariant is invisible at the type level — a future caller could pass a real Unicode string into `stringToBytes` and get silent low-byte truncation. A branded alias on the boundary between `decodeEscapedString` and `toUnicodeText` (e.g. `type Latin1Bytes = string & { readonly __latin1: unique symbol }`) would make the contract explicit and let the compiler catch misuse. Out of scope for this fix — flagged for a future audit pass.

## Related Issues

- `docs/solutions/ui-bugs/async-await-trap-1d-barcode-drawers-2026-04-28.md` — sibling case of the same meta-pattern: a Go-runtime assumption that's invisible on Node and surfaces under different JS semantics. There it was sync-vs-async font registration; here it's `[]byte` vs UTF-16 string.
- `docs/solutions/ui-bugs/reverse-print-and-alpha-encode-bugs-2026-04-28.md` — sibling case where JS-side primitives (alpha channel) carry different invariants than Go's.
- No tracked GitHub issue (caught via the `dhlecommercetr` golden fixture).
