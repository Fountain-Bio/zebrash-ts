---
title: "^FR reverse-print never fired; monochrome encode rasterized transparent pixels as black"
date: 2026-04-28
category: docs/solutions/ui-bugs
module: drawer + image encoders
problem_type: ui_bug
component: tooling
severity: high
symptoms:
  - "^FR reverse-print silently no-ops; white-on-black text and barcodes inside black ^GB bands disappear (painted black-on-black)"
  - "Rounded ^GB rectangles render as solid blobs instead of hollow rings"
  - "Browser inkDeltaRatio metric jumps to 32% on `reverse`, 84% on `gb_rounded`, 6% on `reverse_qr`"
  - "Bugs invisible on the Node golden suite — only surfaced when the browser ink-delta metric landed in commit b2e7d2d"
root_cause: wrong_api
resolution_type: code_fix
related_components:
  - browser-runtime
  - image-encoders
  - drawer-pipeline
tags:
  - reverse-print
  - canvas
  - alpha-channel
  - cross-runtime
  - skia-vs-browser
  - golden-suite
  - destination-out
  - zpl
---

# `^FR` reverse-print never fired; monochrome encode rasterized transparent pixels as black

## Problem

Two related rendering bugs lived dormant in the ZPL renderer until the
browser-side golden suite landed:

1. **`^FR` reverse-print never engaged for any element.** The `drawer.ts`
   predicate looked for an `isReversePrint()` method, but every parser
   constructs reverse-print as a `{ value: boolean }` _property_, so the
   probe was always false. White-on-black text and barcodes inside `^GB`
   black bands rendered black-on-black — invisible.
2. **`encodeMonochrome` / `encodeGrayscale` treated alpha=0 pixels as
   solid black.** `globalCompositeOperation = "destination-out"` (used to
   carve the inner of a rounded `^GB`) leaves alpha=0, R=0. The encoders
   thresholded the red channel only, so transparent regions got emitted as
   ink.

## Symptoms

Browser ink-delta on affected fixtures, pre-fix → post-fix:

| Fixture        | inkDelta before | inkDelta after | Note                                           |
| -------------- | --------------- | -------------- | ---------------------------------------------- |
| `reverse`      | 32.13%          | 0.09%          | The whole reverse-print word was missing       |
| `reverse_qr`   | 6.08%           | 0.08%          | Reverse-print over a 2D barcode                |
| `gb_rounded`   | 84.15%          | 0.08%          | Rounded `^GB` rendered as a filled blob        |
| `glsdk_return` | 2.68%           | 2.63%          | White-on-black "1" / "0026" inside black bands |
| `icapaket`     | 5.54%           | 1.49%          | Now passes both thresholds                     |

Browser pass count: 25 → 29 of 60. Node golden suite stayed 60/60 — the
bug never surfaced there at the 5% pixel-ratio threshold. Plain `^GB`
rectangles by themselves looked fine because black-on-white visually
equals correctly-rendered reverse-printed-black-on-white; the failure
only became visible when something was painted _on top of_ a black
region.

## What Didn't Work

- **The Node golden suite at 5% pixel-ratio threshold never failed any of
  these fixtures.** A fully-text-missing reverse-print render diffed at
  ~1.13% — well under threshold — because the metric is dominated by
  white-on-white pixel matches and only moves ~0.3% when an entire block
  of text disappears.
- **Antialiasing / rasterizer drift between Skia (Node) and the browser**
  already accounts for several percent on glyph edges, so any
  single-channel pixel-count metric is functionally noise above the
  "missing structure" signal.
- **TypeScript's structural typing did not catch the predicate
  mismatch.** `isReversePrintable` was a runtime `typeof === "function"`
  check on a property name (`isReversePrint`) that simply didn't exist on
  the ported elements, so it silently returned `false` for every element
  and the entire reverse-print branch was dead code. The compiler had no
  visibility into a runtime duck-type probe.

## Solution

**`src/drawer.ts` — predicate now reads the property the parsers actually
set:**

```ts
interface ReversePrintable {
  reversePrint: { value: boolean };
}

function isReversePrintable(element: unknown): element is ReversePrintable {
  if (typeof element !== "object" || element === null) return false;
  const rp = (element as { reversePrint?: unknown }).reversePrint;
  return (
    typeof rp === "object" && rp !== null && typeof (rp as { value?: unknown }).value === "boolean"
  );
}

function isReversePrintActive(element: ReversePrintable): boolean {
  return element.reversePrint.value === true;
}

// in drawLabelAsPng:
const reverse = isReversePrintable(element) && isReversePrintActive(element);
```

**`src/images/encode.ts` — composite alpha against white before
thresholding:**

```ts
// encodeMonochrome
for (let i = 0; i < pixels.length; i += 4) {
  const a = pixels[i + 3] ?? 0;
  const r = pixels[i] ?? 0;
  const composited = (r * a + 255 * (255 - a)) / 255;
  const v = composited > MONOCHROME_THRESHOLD ? 255 : 0;
  pixels[i] = v;
  pixels[i + 1] = v;
  pixels[i + 2] = v;
  pixels[i + 3] = 255;
}

// encodeGrayscale — same composite, preserved as 8-bit luma
for (let i = 0; i < pixels.length; i += 4) {
  const a = pixels[i + 3] ?? 0;
  const r = pixels[i] ?? 0;
  const y = Math.round((r * a + 255 * (255 - a)) / 255);
  pixels[i] = y;
  pixels[i + 1] = y;
  pixels[i + 2] = y;
  pixels[i + 3] = 255;
}
```

## Why This Works

- **Predicate shape drift.** Go's `reversePrintable` is an interface with
  an `IsReversePrint() bool` method. The TS port preserved the _interface
  name_ but stored the flag as a `{ value: boolean }` property on every
  element (matching how all parsers — `graphic_box`, `graphic_circle`,
  `graphic_diagonal_line`, `graphic_field`, `recall_graphics`,
  `image_load`, plus `text_field`, `barcode_qr`, `maxicode`, etc. —
  construct the field). The runtime predicate still looked for a method,
  so it was always false. Replacing the method probe with a property
  probe makes the runtime check match the actual element shape.
- **Transparent-pixel semantics.** Both encoders threshold the red
  channel only — fine when alpha is 255, wrong when alpha is 0.
  `globalCompositeOperation = "destination-out"` (used to carve the inner
  of a rounded `^GB`) leaves alpha=0, R=0. Without alpha-aware
  compositing the encoder reads "R=0" and emits ink. The canvas was
  cleared to white at the start of `drawLabelAsPng`, so compositing each
  pixel as `r·a + 255·(255−a)` against an implicit white background
  restores the "see-through" behavior the `^GB` drawer assumed.
- **Why both bugs hid.** A standalone `^GB` rectangle is solid black
  with or without reverse-print, so reverse-print bugs only surface when
  something is painted _on top of_ a black region. And `gb_rounded` is
  the only rounded-corner case in the suite that depends on
  `destination-out` actually clearing pixels rather than producing
  alpha=0 black. Both bugs stayed silent until both conditions appeared
  in a single fixture.

## Prevention

- **`inkDeltaRatio` browser metric** (introduced in commit `b2e7d2d`)
  complements the pixel-ratio metric. It computes
  `|inkA − inkB| / max(inkA, inkB)`. Pixel-ratio is dominated by
  white-on-white matches and moves only ~0.3% when a structure
  disappears; ink-delta jumps to 5–80% in the same case. Both thresholds
  must pass per fixture, so missing-structure regressions can no longer
  slip through.
- **Grep guardrail when porting Go interfaces.** Any Go interface whose
  name ends in `…able` and is implemented as a method should be reviewed
  against the TS data model. A search like
  `rg "isReversePrint|isReversePrintable|Printable\b" src/` would have
  surfaced the dead predicate immediately. The lesson generalizes: when
  porting Go's method-based polymorphism to a struct-based TS port, audit
  each predicate against an actual element instance — TypeScript's
  structural typing won't help when the probe is a runtime duck-type
  check on a name that doesn't exist.
- **Alpha invariant for byte-level pixel encoders.** Anything in
  `src/images/encode.ts` (or future siblings) that reads a single channel
  must first composite against the canvas's clear color. Document the
  invariant alongside the encoder so the next encoder added doesn't
  repeat the bug.
- **Unit test pinning the predicate per parser.** A table-driven test
  that runs `isReversePrintable` against a concrete element instance
  from each parser that sets `reversePrint` (`graphic_box`,
  `graphic_circle`, `graphic_diagonal_line`, `graphic_field`,
  `recall_graphics`, `image_load`, `text_field`, `barcode_qr`,
  `maxicode`, ...) would have caught the original
  method-vs-property drift at unit level instead of waiting for a
  browser-only golden fixture. A future rename of `reversePrint` in any
  one parser would otherwise silently disable reverse-print for that
  element.
- **Extract a `compositeOverWhite(r, a)` helper.** The expression
  `(r * a + 255 * (255 − a)) / 255` is repeated verbatim across
  `encodeMonochrome` and `encodeGrayscale`. Lifting it into a single
  helper lets the alpha invariant live in one place and any future
  encoder pick it up by import rather than by remembering the formula.
- **Defensive fixture covering both bugs at once.** A regression test
  that puts `^FR` text inside a black `^GB` filled rectangle exercises
  reverse-print, and putting it inside a _rounded_ `^GB` also exercises
  the alpha-compositing path:

  ```zpl
  ^XA
  ^FO50,50^GB200,80,80,B,0^FS
  ^FO60,70^FR^A0N,40,40^FDLIVE^FS
  ^XZ
  ```

  The text disappears if reverse-print is broken; the rectangle's
  interior fills if alpha compositing is broken; both must render
  correctly for the test to pass.

## Related Issues

- `CLAUDE.md` lines 217–232 — "Async-await traps in drawers" — sibling
  cross-runtime lesson (different mechanism: unawaited
  `paintHumanReadableText` / `paintEan13Text`). Same failure family:
  Node-silent, browser-loud.
- `CLAUDE.md` lines 163–175 — "Why two suites" + the `inkDeltaRatio`
  definition. The detector that surfaced these bugs.
- Commit `b2e7d2d` — added the browser golden suite and `inkDeltaRatio`
  metric; introduced the `await` fix for 1D-barcode drawers.
- Commit `f79d2ff` — earlier "shape mismatch hides drawer output"
  precedent (non-template `^FS` not resolving to a drawable element).
  Same family: a runtime check whose shape didn't match the actual
  element model, silently dropping output.
- Touched files: `src/drawer.ts`, `src/images/encode.ts`,
  `src/images/reverse_print.ts`, `src/images/reverse_print.test.ts`.
- Exercising fixtures: `test/fixtures/reverse.zpl`, `reverse_qr.zpl`,
  `gb_rounded.zpl`, `glsdk_return.zpl`, `icapaket.zpl`.
