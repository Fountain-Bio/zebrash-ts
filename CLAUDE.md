# CLAUDE.md — guidance for agents working in this repo

This is a pure-TypeScript port of the Go `ingridhq/zebrash` ZPL renderer. The
Go reference lives at `../zebrash` (sibling directory) and is your **source of
truth** for any behavioral question — when in doubt, read the Go code first.

## Quick orientation

```
zebrash-ts/
├── src/
│   ├── parser.ts            # public Parser class — ZPL bytes → LabelInfo[]
│   ├── drawer.ts            # public Drawer class — LabelInfo → PNG bytes
│   ├── drawer-options.ts    # public DrawerOptions interface
│   ├── index.ts             # public surface (Parser, Drawer, types)
│   ├── parsers/             # one ^XX command parser per file (~30 files)
│   │   ├── command_parser.ts        # CommandParser interface + helpers
│   │   ├── field_*.ts               # ^FO, ^FT, ^FB, ^FD, ^FS, etc.
│   │   ├── barcode_*.ts             # ^BC, ^BQ, ^BX, ^B7, etc.
│   │   ├── graphic_*.ts             # ^GB, ^GC, ^GD, ^GF, ^GS
│   │   └── index.ts                 # defaultCommandParsers() — full list
│   ├── elements/            # typed element shapes (TextField, BarcodeQrWithData, ...)
│   │   ├── stored_format.ts         # RecalledFormat + resolveRecalledField
│   │   └── *.ts
│   ├── drawers/             # paint each element kind onto @napi-rs/canvas
│   │   ├── element_drawer.ts        # ElementDrawer interface + helpers
│   │   ├── text_field.ts            # ^FD/^FB text rendering (most complex)
│   │   ├── barcode_*.ts             # 1D + 2D barcode painting
│   │   ├── graphic_*.ts             # ^GB/^GC/^GD/^GF
│   │   ├── maxicode.ts              # hexagonal cell painting
│   │   ├── barcode_paint.ts         # shared paint helpers
│   │   └── index.ts                 # defaultElementDrawers() — full list
│   ├── barcodes/            # encoders (data → bit pattern; no canvas)
│   │   ├── code128/, code39/, twooffive/, ean13/
│   │   ├── pdf417/, aztec/, datamatrix/, qrcode/, maxicode/
│   │   └── utils/                   # BitArray, BitMatrix, BitList, GF, Reed-Solomon
│   ├── printers/virtual.ts  # VirtualPrinter — state across commands
│   ├── images/              # color, encode (monochrome/grayscale PNG), reverse-print
│   ├── hex/decode.ts        # ZPL hex + RLE + Z64 decoder for ^GF / ~DG / ~DU
│   ├── encodings/decode.ts  # ZPL charset → UTF-8 (^CI 0–13, 27)
│   └── assets/              # bundled TTF fonts + GlobalFonts registration
├── test/
│   ├── fixtures/            # 60 .zpl + .png reference pairs from Go suite
│   ├── golden.test.ts       # auto-discovers fixtures, pixel-diffs vs reference
│   ├── e2e.test.ts          # smoke: every fixture renders without throwing
│   └── helpers.ts           # renderZpl, pixelDiff, loadFixture
└── scripts/
    └── render-fixture.ts    # CLI: ZPL → PNG, used for visual debugging
```

## Stack invariants

- **TypeScript strict + ESM only.** `verbatimModuleSyntax: true`,
  `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
  `allowImportingTsExtensions: true` so source uses `.ts` import suffixes;
  `rewriteRelativeImportExtensions: true` rewrites them to `.js` on emit.
- **Both `.ts` and `.js` relative imports work.** Don't normalize across the
  codebase; both forms are intentional.
- **No `any`.** Use `unknown` and narrow.
- **Named exports only**, no default exports.
- **Element-element discrimination** uses a `_kind: "<TypeName>"` literal-string
  field on every element interface. Drawers narrow with
  `if (el._kind !== "TextField") return;`. Always include `_kind` when
  constructing elements in parsers.
- **camelCase property names everywhere.** The original Go uses PascalCase for
  exported fields; the TS port lowercased them to match JS conventions
  (e.g., `position.x`, `font.name`, `barcode.lineAbove`). Do **not** introduce
  PascalCase fields.

## How a label flows through the pipeline

1. **`Parser.parse(zpl)`** splits bytes on `^`/`~` into commands and dispatches
   each to a registered `CommandParser`.
2. Most parsers mutate `VirtualPrinter` state (next position, next font, etc.)
   and return `null`. A few (`^FS`, recall, image-load, graphic, ...) return
   an element to add to the current label.
3. **`^FS` is the only field-emitter.** It snapshots `VirtualPrinter` state into
   either a `RecalledField`, `RecalledFieldData`, or `StoredField` depending on
   `nextElementFieldNumber` and `nextDownloadFormatName`. For the common
   non-template case, `field_separator.ts` calls `resolveRecalledField(...)`
   immediately to convert the placeholder into a concrete drawable
   (`TextField` / `Barcode128WithData` / `MaxicodeWithData` / etc.) — this
   matches Go's `f.Resolve()` at `field_separator.go:26`.
4. **`^XZ`** flushes accumulated elements into a `LabelInfo`. If a recalled
   format was active (`^XF`), its `resolveElements()` collapses it into the
   final element list.
5. **`Drawer.drawLabelAsPng(label, opts)`** creates a `@napi-rs/canvas`,
   iterates `label.elements`, dispatches each to all 14 registered
   `ElementDrawer`s (each one early-returns if `el._kind` doesn't match), and
   PNG-encodes the result.

## Critical files (read these first when investigating bugs)

- `src/parser.ts` — top-level parse loop with `^XA`/`^XZ` and recall handling.
  Mirrors `parser.go` line for line.
- `src/elements/stored_format.ts` — `RecalledFormat` class + the
  `resolveRecalledField` switch over `field.element` kinds (Maxicode, PDF417,
  Code128, EAN13, 2of5, Code39, Aztec, DataMatrix, QR, GraphicSymbol,
  FieldBlock, TextField, default → TextField). Most "element doesn't render"
  bugs trace back here.
- `src/printers/virtual.ts` — every parser reads/writes this state machine.
  When a field comes out wrong, check what state was set just before `^FS`.
- `src/drawer.ts` — image-width clamping, reverse-print buffer, invert,
  grayscale path, final encode. Mirrors `drawer.go`.
- `src/drawers/text_field.ts` — most complex drawer. Font scaling, orientation,
  wrap, anchor positioning. Bitmap-emulation TTFs use a 2× width-to-height
  multiplier (justified inline).
- `src/drawers/barcode_paint.ts` — `paintBitArrayBars`, `paintBitMatrixCells`
  (now accepts separate moduleW × moduleH for PDF417), `paintEan13Text`,
  `paintHumanReadableText` shared by 1D-barcode drawers.

## Conventions when porting from Go

- One `.ts` file per `.go` file unless trivially tiny.
- Mirror Go function names but lowercase the leading letter for exported
  factories (`NewBarcode128Drawer` → `newBarcode128Drawer`).
- Replace `[]byte` with `Uint8Array`; `[]int32` / `[]uint32` with `Int32Array`
  / `Uint32Array`.
- For Go `func()` returning `(value, ok bool)` use `{ value, ok }` object
  return — not a tuple.
- Go `image.Image.At(x, y)` becomes a class method `at(x, y): boolean` on
  `BitMatrix` / `BitArray` / `BitList` / `AztecCode` / `SymbolGrid`.
- Bit math gotcha: JS bitwise ops are 32-bit signed. Use `>>> 0` to coerce
  to unsigned where Go uses `uint32`.

## Testing

- **Golden suite (`test/golden.test.ts`)** auto-discovers every
  `test/fixtures/*.zpl`. Per-fixture options live in `FIXTURE_OPTIONS` (mirrors
  Go's `parser_test.go`). Per-fixture diff overrides live in
  `FIXTURE_OVERRIDES` (default 5 %).
- **Adding a new fixture**: drop the `.zpl` and Go-rendered `.png` into
  `test/fixtures/`. The golden suite picks it up on the next run.
- **Visual debugging**: `bun run scripts/render-fixture.ts test/fixtures/<name>.zpl --out /tmp/x.png`
  then `open /tmp/x.png`. Compare to `test/fixtures/<name>.png`.
- **Per-encoder unit tests** live next to the encoder
  (`src/barcodes/code128/encoder.test.ts` etc.). They lock in known bit
  patterns for canonical inputs.

## Things that are subtle

- **EAN-13 guard bars** extend below data bars by `guardExtension` so the
  digits sit in the white space between. `paintEan13Bars` in
  `src/drawers/barcode_ean13.ts` uses `isGuardBar(moduleIndex)` from the
  encoder to decide each column's height.
- **PDF417 modules** are `2 px` wide × `rowHeight` px tall (not square) —
  matches Go's `images.NewScaled(barcode, 2, scaleY)`. Use the
  `paintBitMatrixCells(ctx, matrix, pos, moduleWidth, moduleHeight)` 2-size
  variant.
- **`^FH` hex escape** stores the escape _byte_ as a number on
  `printer.nextHexEscapeChar`; `field_data.ts` converts to a single-char
  string before passing to `decodeEscapedString`.
- **Non-template `^FS`** (no `^XF` active) **must** call
  `resolveRecalledField` — otherwise drawers silently skip the raw
  `RecalledField` element. This was the bug that hid all text and barcodes
  for the first several days of the port.
- **Skia vs FreeType drift** is real and unavoidable on glyph edges.
  Aim for ≤ 5 % pixel diff; over that, check for a real bug before
  raising the threshold.
- **Canvas vs context** distinction matters: `images/` utilities take a
  `Canvas`, drawers operate on `SKRSContext2D`. Pass `ctx.canvas` when
  bridging.

## When investigating a rendering bug

1. Render the failing fixture: `bun run scripts/render-fixture.ts test/fixtures/<name>.zpl --out /tmp/x.png`
2. Diff visually against `test/fixtures/<name>.png` (Read tool renders PNGs inline).
3. If TS shows nothing where Go shows something: check element-shape with a
   tiny script that prints `Parser().parse(zpl).elements.map(e => e._kind)` —
   if a `_kind` is missing or unexpected, parser bug; otherwise drawer bug.
4. If TS shows the wrong shape: trace into the responsible drawer
   (`src/drawers/<kind>.ts`) and compare line-by-line to
   `../zebrash/internal/drawers/<kind>.go`.
5. If only pixel-level (subpixel offsets, antialiasing): probably rasterizer
   drift — verify by counting the diff pixels' magnitude (low-magnitude
   diffs cluster on glyph edges).

## Don't do

- Don't add per-fixture overrides above 10 %. That's the threshold above which
  there's almost certainly a real bug, not just rasterizer drift.
- Don't change naming conventions (PascalCase fields, default exports, etc.) —
  the codebase is consistent and divergence ripples.
- Don't add features the Go reference doesn't have. Parity is the goal.
- Don't run `git push` without being asked — this is a local-only repo (no
  remote configured by default).
