---
title: "Async-await trap in 1D-barcode drawers (Node-silent, browser-loud)"
date: 2026-04-28
category: docs/solutions/ui-bugs
module: 1D barcode drawers
problem_type: ui_bug
component: tooling
severity: high
symptoms:
  - "EAN-13 digits missing on rotated barcodes; on horizontal barcodes text painted in the wrong rotation"
  - "Code 128 / Code 39 / 2 of 5 under-bar text drifting from bar position"
  - "Bug invisible on Node golden suite (font registration is sync); only surfaces in browser, where registerEmbeddedFonts awaits a CDN fetch"
  - "Pre-fix browser ratio for ean13 was 1.13% (under threshold) — fully-text-missing render slipped through"
root_cause: async_timing
resolution_type: code_fix
related_components:
  - browser-runtime
  - drawer-pipeline
  - testing-framework
tags:
  - async-await
  - cross-runtime
  - canvas
  - font-loading
  - ink-delta
  - golden-suite
  - skia-vs-browser
---

# Async-await trap in 1D-barcode drawers (Node-silent, browser-loud)

## Problem

The four 1D-barcode drawers (Code 128, Code 39, 2 of 5, EAN-13) called
the async helpers `paintHumanReadableText` / `paintEan13Text` without
`await`. Those helpers are async because they `await
registerEmbeddedFonts()` before the first `fillText`, and on the browser
backend that registration waits on a real CDN fetch — long enough that
the surrounding `ctx.save() / ctx.restore()` block has already unrolled
and the canvas has already been encoded by the time the text would land.

## Symptoms

- EAN-13 digits missing entirely on rotated barcodes; on horizontal
  barcodes the digits painted in the wrong rotation (rotation state
  from a prior element leaked into the late `fillText`).
- Code 128, Code 39, and 2 of 5 under-bar human-readable text drifted
  from bar position or vanished depending on what came next on the
  canvas.
- Node golden suite passed cleanly. Browser golden suite for `ean13`
  reported `ratio` 1.13 % — under the 5 % threshold — even though the
  digits were entirely absent from the rendered PNG.
- After fix: browser `ean13` ratio 1.29 %, `inkDeltaRatio` 0.19 %.

## What Didn't Work

TypeScript did not catch it. The `ElementDrawer.draw` interface accepts
both `void` and `Promise<void>` returns, so a synchronous drawer
calling an async helper without `await` was a structurally valid
implementation. The compiler has no way to know that the helper's
awaited side effect (font registration) was load-bearing for the
`ctx.save` / `ctx.restore` block around it.

The Node golden suite did not catch it because Node's
`registerEmbeddedFonts` is effectively synchronous —
`GlobalFonts.register` from `@napi-rs/canvas` runs to completion inside
a Promise wrapper, so the orphan promise resolves on the next
microtask, before the canvas is encoded. Text lands correctly on every
Node fixture.

The classic pixel-ratio metric did not catch it either. With a
2400×2400-pixel label, the area covered by a few human-readable digits
is well under 5 % of total pixels. White-on-white matches dominate the
denominator, antialiasing drift on glyph edges already eats 1–3 % of
the budget on every text-heavy fixture, and a fully-text-missing
reverse-print render still came in at 1.13 %.

## Solution

Each affected drawer now declares `async draw` and awaits the helper.
Representative shape (Code 128):

```ts
// before
draw(ctx, element): void {
  // ... bar painting ...
  paintHumanReadableText(
    ctx, text, pos, barcode.lineAbove,
    moduleWidth, width, height,
  );
  // ... ctx.restore() ...
}

// after
async draw(ctx, element): Promise<void> {
  // ... bar painting ...
  await paintHumanReadableText(
    ctx, text, pos, barcode.lineAbove,
    moduleWidth, width, height,
  );
  // ... ctx.restore() ...
}
```

The same pattern applies in:

- `src/drawers/barcode_128.ts`
- `src/drawers/barcode_2of5.ts`
- `src/drawers/barcode_39.ts`
- `src/drawers/barcode_ean13.ts`

## Why This Works

On Node, `registerEmbeddedFonts` reads bundled TTFs synchronously from
disk and registers them via `GlobalFonts.register`. Wrapping that in a
Promise still resolves on the very next microtask, so even an unawaited
call completes before the surrounding `ctx.save`/`restore` block
unrolls — the drawer "got lucky" by accident.

On the browser, `registerEmbeddedFonts` does a real `fetch` against the
CDN-hosted TTF, then constructs a `FontFace`, then waits on
`document.fonts.add()`. That's hundreds of milliseconds, easily
enough for the parent drawer to return, the next element to paint, and
`Drawer.drawLabelAsPng` to encode the canvas. When the font finally
arrives, the late `fillText` either no-ops (canvas already serialized),
or — worse — runs against a transform matrix that's been mutated by a
later element, which is how rotated digits leaked into a horizontal
barcode.

TypeScript could not flag this because both `void` and `Promise<void>`
satisfy the `ElementDrawer.draw` signature. There is no type-level
expression of "if you call an async helper, your caller must be async
too" without a lint rule.

## Prevention

**`inkDeltaRatio` metric** (added in this same commit). Defined as
`|inkA − inkB| / max(inkA, inkB)` over the count of non-background
pixels. Threshold 2 %. The classic `ratio` only moves ~0.3 % when an
entire block of text is missing because white-on-white matches
dominate; `inkDeltaRatio` jumps to 5–80 % in those cases because the
total ink count itself diverges. Both metrics must pass for a fixture
to be green. This is what flipped the `ean13` browser fixture from
silently passing to loudly failing.

**Lint rule.** `@typescript-eslint/no-floating-promises` enforced in
the drawers package. Any unawaited Promise becomes a build error,
which would have caught the original mistake at the line of the
`paintHumanReadableText` call.

**Audit guideline.** Any helper that awaits `registerEmbeddedFonts`
(or any other platform-async resource) requires its callers to be
`async draw`. The current platform-async surface is small —
`registerEmbeddedFonts` and `loadImage` — and both are easy to grep.

**Bounded blast radius.** The 2D barcode drawers (Aztec, DataMatrix,
QR, PDF417, Maxicode) do not render human-readable text and never call
the async paint helpers, so they stay synchronous. The trap class is
currently bounded to the four 1D-barcode drawers above.

## Related Issues

- `docs/solutions/ui-bugs/reverse-print-and-alpha-encode-bugs-2026-04-28.md`
  — sibling cross-runtime bug surfaced once `inkDeltaRatio` was in
  place (35 browser fixtures intentionally failed post-commit; this
  was one of them).
- Commit `f8570d5` — followup `textBaseline 'top'` fix on EAN-13 so
  digits sit below the bars. Different mechanism (text metric drift,
  not async timing), same weekend, surfaced by the same metric.
- Commit `64fe479` — followup reverse-print + monochrome alpha-encode
  fix. Also surfaced by `inkDeltaRatio`.
- `CLAUDE.md` — "Async-await traps in drawers" section (lines
  217–232) records this trap class as a permanent gotcha for future
  contributors.
- Touched files: `src/drawers/barcode_128.ts`,
  `src/drawers/barcode_2of5.ts`, `src/drawers/barcode_39.ts`,
  `src/drawers/barcode_ean13.ts`,
  `src/drawers/barcode_paint.ts` (the async helpers themselves),
  `test/browser-helpers.ts` (where `inkDeltaRatio` is computed),
  `test/golden.browser.test.ts` (where both thresholds are enforced).
