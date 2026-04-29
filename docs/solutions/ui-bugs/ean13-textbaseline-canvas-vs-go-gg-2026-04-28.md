---
title: "EAN-13 digits painted on top of bars: Canvas alphabetic baseline vs Go gg anchor"
date: 2026-04-28
category: docs/solutions/ui-bugs
module: barcode_paint (EAN-13)
problem_type: ui_bug
component: tooling
severity: medium
symptoms:
  - "EAN-13 human-readable digits painted directly on top of the data bars instead of in the white channel between data bars and guard bars"
  - "Visible only in the browser at first; Node Skia exhibited the same offset but within rasterizer-drift threshold"
  - "Browser fixture diff: ean13 ratio improved from misaligned to 1.36% (matches Node 1.31% within drift)"
root_cause: wrong_api
resolution_type: code_fix
related_components:
  - drawer-pipeline
  - go-port
tags:
  - canvas
  - text-baseline
  - go-port
  - gg-anchored
  - ean13
  - cross-runtime
---

# EAN-13 digits painted on top of bars: Canvas alphabetic baseline vs Go gg anchor

## Problem

The EAN-13 human-readable digits at the bottom of the barcode were
painted directly on top of the data bars, instead of sitting in the
white channel between the data-bar bottoms and the guard-bar bottoms.
Visually the digits looked smashed up into the barcode itself — the
guard-extension space below the data bars sat empty while the glyphs
overlapped the black bars above.

## Symptoms

- EAN-13 digits visibly overlapped the data bars in the browser viewer
  (`examples/`) for the `ean13` fixture.
- Node Skia rendered the same offset but the diff sat within the
  ~5% rasterizer-drift envelope, so the Node golden suite passed.
- Browser inkDeltaRatio metric flagged the discrepancy where the simple
  pixel-ratio metric had not.
- After fix: `ean13` ratio = **1.36%**, inkDelta = **0.17%**, matching
  the Node golden suite (1.31%) within rasterizer drift.

## What Didn't Work

The first port copied Go's y-formula verbatim and left
`ctx.textBaseline` unset (Canvas defaults to `"alphabetic"`):

```ts
ctx.textBaseline = "alphabetic";
const y = pos.y + height + fontSize - guardExtension;
```

This was reasonable by precedent — `paintHumanReadableText` (the helper
shared by Code 128 / 39 / 2 of 5) does the same thing and passes its
golden tests cleanly. The porter assumed the same y-formula transposition
would work for EAN-13. It did not, because EAN-13 alone has the
guard-extension math that places digits inside a narrow white channel
where any baseline drift becomes visible.

## Solution

In `src/drawers/barcode_paint.ts`, switch `paintEan13Text` to
`textBaseline = "top"` and offset the `lineAbove` branch by `-fontSize`
to compensate.

Before:

```ts
ctx.font = `${fontSize}px "${FONT0_NAME}"`;
ctx.textBaseline = "alphabetic";

if (text.length === 13 && !lineAbove) {
  const y = pos.y + height + fontSize - guardExtension;
  // ... y interpreted as BASELINE → glyphs shoved up onto bars
} else {
  const y = pos.y - guardExtension / 2;
  ctx.fillText(text, x, y);
}
```

After:

```ts
ctx.font = `${fontSize}px "${FONT0_NAME}"`;
// Match Go's `gg.DrawString*` semantics, where the y argument is the
// top of the text bounding box (anchor = 0). Canvas's default
// "alphabetic" would treat y as the baseline and shove the digits up
// onto the bars.
ctx.textBaseline = "top";

if (text.length === 13 && !lineAbove) {
  const y = pos.y + height + fontSize - guardExtension;
  // ... now `y` is the text TOP, matching gg's placement
} else {
  const y = pos.y - guardExtension / 2 - fontSize;
  ctx.fillText(text, x, y);
}
```

The change is scoped to `paintEan13Text`. `paintHumanReadableText`
(Code 128 / 39 / 2 of 5) is left at the Canvas default because it
already passes — < 0.05% on Node, < 0.5% inkDelta on the browser side.

## Why This Works

Go's `gg.DrawStringAnchored(text, x, y, anchorX, anchorY)` with
`anchorY = 0` treats `y` as the **top** of the text bounding box. HTML
Canvas's default `textBaseline = "alphabetic"` treats `y` as the
**baseline** of the text — which sits roughly `fontSize` pixels below
the top, just under most glyphs. So a y-formula that's correct under gg
puts text ~`fontSize` px too high under Canvas.

EAN-13 makes this visible because of the guard-extension geometry. The
data bars stop at `pos.y + height - guardExtension`, the guard bars
extend down to `pos.y + height`, and the digits are supposed to sit in
the white channel between those two y-values. That channel is only
slightly taller than `fontSize`, so a baseline-vs-top mismatch shoves
the entire glyph up out of the channel and onto the data bars.

`paintHumanReadableText` doesn't have that geometry. Its text sits in
open space below the barcode, so the same `~fontSize` offset just
nudges the line a few pixels up — well within rasterizer-drift
tolerance and invisible to both eyes and metrics.

## Prevention

- When porting a Go function that uses any `gg.DrawString*` call,
  audit whether the y-coordinate is being treated as text TOP (gg with
  anchor=0) or BASELINE (Canvas default alphabetic). The simplest
  portable rule: always set `ctx.textBaseline = "top"` at the top of
  any text-rendering helper to match gg's anchor=0 behavior, and
  adjust y-formulas accordingly. Worth documenting as a convention in
  CLAUDE.md.
- Future text-rendering helpers should set `textBaseline` explicitly at
  the start of the function rather than relying on the Canvas default,
  so the contract is local and obvious to readers.
- The `inkDeltaRatio` metric (introduced in commit `b2e7d2d`) is what
  surfaced the visible offset here. The pixel-ratio metric alone
  swallowed it because the bars-and-digits region is tiny relative to
  the whole label.

## Related Issues

- `docs/solutions/ui-bugs/async-await-trap-1d-barcode-drawers-2026-04-28.md`
  — sibling commit `b2e7d2d` that introduced the `inkDeltaRatio`
  metric and fixed the async-await trap that caused 1D drawers to
  drop their human-readable text on the browser path.
- `docs/solutions/ui-bugs/reverse-print-and-alpha-encode-bugs-2026-04-28.md`
  — sibling commit `64fe479` covering reverse-print compositing and
  alpha-channel handling in monochrome encode.
- `CLAUDE.md` "Things that are subtle" section — EAN-13 guard-bar
  extension note (the geometry that makes this misalignment visible).
- Touched file: `/Users/alancohen/fountain-bio/zebrash-ts/src/drawers/barcode_paint.ts`
  (`paintEan13Text` only).
