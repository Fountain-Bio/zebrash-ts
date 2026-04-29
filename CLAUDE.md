# CLAUDE.md — guidance for agents working in this repo

This is a pure-TypeScript port of the Go `ingridhq/zebrash` ZPL renderer. The
Go reference lives at `../zebrash` (sibling directory) and is your **source of
truth** for any behavioral question — when in doubt, read the Go code first.

## Quick orientation

This is a bun-workspaces monorepo publishing **three packages**:

- `@zebrash/core` — engine. Parser + drawer + encoders + platform abstraction. Internal: end users should not import directly.
- `@zebrash/node` — thin Node wrapper. Re-exports core, pulls `@napi-rs/canvas` as a hard dep.
- `@zebrash/browser` — thin browser wrapper. Re-exports core + `setFontBaseUrl`. Zero native deps.

Both wrappers expose the **same** public API (`Parser`, `Drawer`, `DrawerOptions`, `LabelInfo`, `drawerOptionsWithDefaults`). Pick by runtime, not by feature.

```
zebrash-ts/
├── packages/
│   ├── core/                # @zebrash/core
│   │   ├── package.json     # browser-field swap, exports, fflate dep
│   │   └── src/
│   │       ├── parser.ts            # public Parser class — ZPL bytes → LabelInfo[]
│   │       ├── drawer.ts            # public Drawer class — LabelInfo → PNG bytes
│   │       ├── drawer-options.ts    # public DrawerOptions interface
│   │       ├── index.ts             # public surface (Parser, Drawer, types)
│   │       ├── platform.ts          # Node default; "browser" field swaps to platform-browser.ts
│   │       ├── platform-browser.ts  # Browser variant
│   │       ├── platform/
│   │       │   ├── types.ts         # Platform interface
│   │       │   ├── node.ts          # @napi-rs/canvas backend
│   │       │   ├── browser.ts       # OffscreenCanvas backend
│   │       │   └── inflate.ts       # universal (DecompressionStream / fflate)
│   │       ├── parsers/             # one ^XX command parser per file (~30 files)
│   │       ├── elements/            # typed element shapes
│   │       │   └── stored_format.ts # RecalledFormat + resolveRecalledField
│   │       ├── drawers/             # paint each element kind onto canvas (PNG path)
│   │       │   ├── element_drawer.ts        # ElementDrawer interface + helpers
│   │       │   ├── text_field.ts            # most complex drawer
│   │       │   ├── barcode_*.ts             # 1D + 2D barcode painting
│   │       │   ├── barcode_paint.ts         # shared paint helpers
│   │       │   └── index.ts                 # defaultElementDrawers()
│   │       ├── svg-drawers/         # emit each element as SVG (drawLabelAsSvg)
│   │       │   ├── svg_element_drawer.ts    # SvgElementDrawer interface
│   │       │   ├── transform.ts             # rotateAbout / scaleAbout / rotateForOrientation
│   │       │   ├── text_field.ts            # uses platform measurement canvas + emits <text>
│   │       │   ├── graphic_field.ts         # only raster fallback: <image> with base64 PNG
│   │       │   ├── barcode_*.ts             # SVG analogues, share barcode_paint_svg.ts
│   │       │   ├── barcode_paint_svg.ts     # bar/cell/text SVG helpers (run-collapsed rects)
│   │       │   └── index.ts                 # defaultSvgElementDrawers()
│   │       ├── svg/                 # SVG infrastructure (no platform deps)
│   │       │   ├── emitter.ts               # SvgEmitter — pure-string canvas analog
│   │       │   └── font_embed.ts            # builds @font-face CSS from FontKey set
│   │       ├── barcodes/            # encoders (data → bit pattern; no canvas)
│   │       ├── printers/virtual.ts  # VirtualPrinter — state across commands
│   │       ├── images/              # color, encode, reverse-print
│   │       ├── hex/decode.ts        # ZPL hex + RLE + Z64 decoder
│   │       ├── encodings/decode.ts  # ZPL charset → UTF-8
│   │       └── assets/              # font loaders + bundled TTFs
│   │           ├── fonts.ts                 # Node disk loader
│   │           ├── fonts-browser.ts         # Browser CDN fetcher (also exports setFontBaseUrl)
│   │           ├── register.ts              # registerEmbeddedFonts()
│   │           └── fonts/                   # 4 TTF files (shipped via package.json#files)
│   ├── node/                # @zebrash/node
│   │   ├── package.json     # depends on @zebrash/core + @napi-rs/canvas
│   │   └── src/index.ts     # `export * from "@zebrash/core"`
│   └── browser/             # @zebrash/browser
│       ├── package.json     # depends on @zebrash/core only
│       └── src/index.ts     # re-exports core + setFontBaseUrl
├── test/                    # cross-package golden + e2e suites
│   ├── fixtures/            # 59 .zpl + 62 .png reference pairs from Go suite
│   ├── golden.test.ts       # PNG: imports @zebrash/node, pixel-diffs vs reference
│   ├── golden.browser.test.ts # PNG browser: runs in Chromium via Playwright
│   ├── svg-golden.test.ts   # SVG: rasterises via @resvg/resvg-js, pixel-diffs vs same fixtures
│   ├── svg-e2e.test.ts      # smoke: every fixture produces valid SVG
│   ├── e2e.test.ts          # smoke: every fixture renders to PNG without throwing
│   ├── helpers.ts           # renderZpl, renderZplAsSvg, pixelDiff, loadFixture
│   └── browser-helpers.ts   # browser-side pixelDiff
├── examples/                # Vite app — workspace member, depends on @zebrash/browser
├── scripts/render-fixture.ts # CLI: ZPL → PNG (or → SVG with --svg)
├── vitest.config.ts         # `core` / `node` / `browser` projects
└── docs/solutions/          # YAML-frontmatter learnings for past bugs
```

## Platform layer (Node + browser)

The library is universal. All Node/browser divergence lives inside
`@zebrash/core` and is selected via `package.json#browser` when bundlers
trace through `@zebrash/browser`'s dep graph into core.

- **`packages/core/src/platform/types.ts`** — `Platform` interface with five methods:
  `createCanvas`, `encodePng`, `loadImage`, `registerFont`, `createImageData`.
- **`packages/core/src/platform/node.ts`** — Node implementation using `@napi-rs/canvas`.
- **`packages/core/src/platform/browser.ts`** — Browser implementation using
  `OffscreenCanvas`, `createImageBitmap`, `FontFace`, native `ImageData`.
- **`packages/core/src/platform.ts`** — re-exports the Node platform. The
  core package's `"browser"` field swaps this file with `platform-browser.ts`
  in browser bundles.
- **`packages/core/src/assets/fonts.ts`** vs **`packages/core/src/assets/fonts-browser.ts`** —
  Node reads bundled TTFs from disk (`fs.readFileSync`, anchored at
  `<pkg>/src/assets/fonts/` so it works in source mode, dist mode, and from
  a published tarball); browser lazy-fetches them from a CDN (default
  jsdelivr). Same swap mechanism.
- **`packages/core/src/platform/inflate.ts`** uses native `DecompressionStream`
  - `fflate` — pure-JS, works on both backends. No `node:zlib` import anywhere.

When adding code that needs a canvas, `ImageData`, font registration, PNG
encoding, or zlib inflate: import from `./platform.ts` (or `fflate` for
inflate). Don't import directly from `@napi-rs/canvas` or `node:*` outside
`packages/core/src/platform/node.ts` and `packages/core/src/assets/fonts.ts`.

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
5. **`Drawer.drawLabelAsPng(label, opts)`** creates a platform canvas,
   iterates `label.elements`, dispatches each to all 14 registered
   `ElementDrawer`s (each one early-returns if `el._kind` doesn't match), and
   PNG-encodes the result.
6. **`Drawer.drawLabelAsSvg(label, opts)`** is the parallel SVG path. Same
   element loop, but each element goes through the matching
   `SvgElementDrawer` (also 14, in the same order) and writes into an
   `SvgEmitter` buffer. Reverse-print elements are wrapped in a
   `<g style="mix-blend-mode:difference">` group; inverted labels in a
   `rotate(180)` group. Only `^GF` (graphic field) falls back to raster —
   it embeds a base64 PNG via `<image>`. Fonts are referenced according to
   `opts.fontEmbed` (`"url"` default, `"embed"`, or `"none"`).

## Critical files (read these first when investigating bugs)

All engine code lives in `packages/core/src/`. The wrapper packages
(`packages/node/src/index.ts`, `packages/browser/src/index.ts`) are
one-liner re-exports — bugs are virtually never there.

- `packages/core/src/parser.ts` — top-level parse loop with `^XA`/`^XZ` and recall handling.
  Mirrors `parser.go` line for line.
- `packages/core/src/elements/stored_format.ts` — `RecalledFormat` class + the
  `resolveRecalledField` switch over `field.element` kinds (Maxicode, PDF417,
  Code128, EAN13, 2of5, Code39, Aztec, DataMatrix, QR, GraphicSymbol,
  FieldBlock, TextField, default → TextField). Most "element doesn't render"
  bugs trace back here.
- `packages/core/src/printers/virtual.ts` — every parser reads/writes this state machine.
  When a field comes out wrong, check what state was set just before `^FS`.
- `packages/core/src/drawer.ts` — image-width clamping, reverse-print buffer, invert,
  grayscale path, final encode. Mirrors `drawer.go`.
- `packages/core/src/drawers/text_field.ts` — most complex drawer. Font scaling, orientation,
  wrap, anchor positioning. Bitmap-emulation TTFs use a 2× width-to-height
  multiplier (justified inline).
- `packages/core/src/drawers/barcode_paint.ts` — `paintBitArrayBars`, `paintBitMatrixCells`
  (accepts separate moduleW × moduleH for PDF417), `paintEan13Text`,
  `paintHumanReadableText` shared by 1D-barcode drawers.
- `packages/core/src/svg/emitter.ts` — `SvgEmitter`, the canvas-context
  analog used by every SVG drawer. Pure string assembly, tracks `usedFonts`
  for the `@font-face` builder.
- `packages/core/src/svg-drawers/text_field.ts` — same complexity as the
  canvas text drawer, plus a per-process measurement canvas (acquired via
  `platform.createCanvas(1,1)`) so `wordWrap` lands on the same line breaks
  as the PNG path.
- `packages/core/src/svg-drawers/graphic_field.ts` — the only SVG drawer
  that touches `platform`. Re-rasterises the bit-packed `^GF` payload into
  a canvas, encodes PNG, and embeds it as a base64 `<image>`.

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

- **Three projects in `vitest.config.ts`** (vitest 4 — `test.projects` array):
  - `core` — unit tests inside `packages/core/src/**/*.test.ts`. Vitest
    transforms source `.ts` directly; no build needed.
  - `node` — repo-root `test/golden.test.ts` + `test/e2e.test.ts` against
    built `@zebrash/node`. Auto-builds via the `bun run test` script.
  - `browser` — `test/golden.browser.test.ts` against built `@zebrash/browser`,
    rendered in real Chromium via `@vitest/browser-playwright`.
- **Run:** `bun run test` (core + node, builds first), `bun run test:browser`
  (browser only, builds first), `bun run test:all` (everything, builds first).
- **Golden suite (`test/golden.test.ts`)** auto-discovers every
  `test/fixtures/*.zpl`. Per-fixture options live in `FIXTURE_OPTIONS` (mirrors
  Go's `parser_test.go`). Per-fixture diff overrides live in
  `FIXTURE_OVERRIDES` (default 5 %). The browser suite mirrors both maps.
- **Why three suites:** Core unit tests verify encoders + parser logic in
  isolation. Node and browser have _separate_ failure modes downstream of
  that — Skia (Node) handles compositing, font registration, and timing
  differently from the browser canvas. The browser suite catches bugs that
  look fine on the Node path — most notably the async-await trap in barcode
  drawers (see "Async-await traps" below) and reverse-print compositing.
- **Two thresholds per fixture, both must pass** (browser suite):
  - `ratio` (default 5 %) — fraction of all pixels that differ. Same as
    the Node suite.
  - `inkDeltaRatio` (default 3 %) — symmetric ink-count delta:
    `|inkA - inkB| / max(inkA, inkB)`. Catches _missing structure_. The
    classic `ratio` metric is dominated by white-on-white matches and only
    moves ~0.3 % when an entire block of text is missing — well below any
    sane threshold. `inkDeltaRatio` jumps to 5–80 % in those cases because
    the actual rendered "ink" count diverges from the reference.
- **Adding a new fixture**: drop the `.zpl` and Go-rendered `.png` into
  `test/fixtures/`. The golden suite picks it up on the next run.
- **Visual debugging**: `bun run scripts/render-fixture.ts test/fixtures/<name>.zpl --out /tmp/x.png`
  then `open /tmp/x.png`. Compare to `test/fixtures/<name>.png`. Run
  `bun run build` first — the script imports `@zebrash/node`.
- **Per-encoder unit tests** live next to the encoder
  (`packages/core/src/barcodes/code128/encoder.test.ts` etc.). They lock in
  known bit patterns for canonical inputs.

## Browser viewer (`examples/`)

`examples/` is a vite app — a workspace member that depends on
`@zebrash/browser` via `workspace:*`. It renders every fixture in the
browser using the **built** package output, side-by-side with the Go
reference. Canonical way to eyeball the browser path.

```bash
bun run build           # rebuild packages/*/dist/ after source edits
bun run dev --cwd examples   # http://127.0.0.1:5173
```

Side-by-side panes per fixture: live browser render (left) vs the static
Go-reference PNG from `test/fixtures/<name>.png` (right). URL hash syncs to
the active fixture for shareable links (`#fedex`, etc.).

Wiring (deliberately plugin-free):

- **No platform-swap plugin needed.** Vite traces `@zebrash/browser` →
  `@zebrash/core` and reads core's `"browser"` field, substituting
  `dist/platform-browser.js` + `dist/assets/fonts-browser.js` automatically.
- **No `optimizeDeps.exclude` for `@napi-rs/canvas`.** It isn't in the
  browser package's dep graph at all, so Vite never sees it.
- **Fixture loading uses `import.meta.glob`** — `?raw` for the ZPL source,
  `?url` for the reference PNG. No middleware, no manifest file.
- **You must run `bun run build` after editing core source.** The example
  consumes `packages/browser/dist/` (which transitively reads
  `packages/core/dist/`), not the source tree.

The reference PNGs are static — they were generated **once** by the Go
`ingridhq/zebrash` test suite and committed to `test/fixtures/`. We do not
re-run Go anywhere in this repo. To regenerate or add a fixture, capture the
Go output separately and drop the `.zpl` + `.png` pair into `test/fixtures/`.

## Async-await traps in drawers (read this before editing drawers!)

`paintHumanReadableText` and `paintEan13Text` in `barcode_paint.ts` are
**async** because they `await registerEmbeddedFonts()` before the first
`fillText`. **Every barcode drawer that calls them must be `async draw` and
must `await` the call.**

The fire-and-forget mistake is silent on Node — font registration there is
synchronous, so the orphan promise resolves on the next microtask, before
the canvas gets encoded. In the browser, `registerEmbeddedFonts` waits on a
real CDN fetch. By the time the fetch resolves, the surrounding `ctx.save()
/ ctx.restore()` has unrolled the rotation and the canvas has been encoded
to PNG — text either never lands, or lands rotated incorrectly.

Currently four drawers go through this path: `barcode_128.ts`,
`barcode_2of5.ts`, `barcode_39.ts`, `barcode_ean13.ts`. The 2D barcode
drawers (aztec, datamatrix, qr, pdf417, maxicode) don't render
human-readable text, so they stay synchronous.

## Things that are subtle

- **EAN-13 guard bars** extend below data bars by `guardExtension` so the
  digits sit in the white space between. `paintEan13Bars` in
  `packages/core/src/drawers/barcode_ean13.ts` uses `isGuardBar(moduleIndex)`
  from the encoder to decide each column's height.
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
- **resvg vs Skia drift** is similar but slightly larger on text — the SVG
  golden suite defaults to ≤ 7 %, with three text-heavy fixtures at 11 %.
  Above 11 %, investigate before raising.
- **Canvas vs context** distinction matters: `images/` utilities take a
  `Canvas`, drawers operate on `SKRSContext2D`. Pass `ctx.canvas` when
  bridging.
- **SVG group balance**: `SvgEmitter.save()`/`restore()` mirrors canvas
  semantics by counting how many `<g transform=…>` opens have happened
  since the last `save`, and emitting matching `</g>`s on `restore`. Every
  `translate`/`rotate`/`scale`/`pushGroup` opens exactly one `<g>`. If you
  add a new emit method that opens a group, increment `openGroups` so the
  bookkeeping stays correct.
- **Reverse-print in SVG** uses `mix-blend-mode: difference` (mathematically
  XOR for monochrome content), not raster compositing. If the PNG and SVG
  diverge on a `^FR` field, suspect a non-monochrome value sneaking into
  the SVG — `difference` only matches XOR for pure black/white.

## When investigating a rendering bug

1. Render the failing fixture: `bun run scripts/render-fixture.ts test/fixtures/<name>.zpl --out /tmp/x.png`
   (or `--svg --out /tmp/x.svg` for the SVG path).
2. Diff visually against `test/fixtures/<name>.png` (Read tool renders PNGs inline).
3. If TS shows nothing where Go shows something: check element-shape with a
   tiny script that prints `Parser().parse(zpl).elements.map(e => e._kind)` —
   if a `_kind` is missing or unexpected, parser bug; otherwise drawer bug.
4. If TS shows the wrong shape: trace into the responsible drawer
   (`packages/core/src/drawers/<kind>.ts`, or
   `packages/core/src/svg-drawers/<kind>.ts` for SVG) and compare
   line-by-line to `../zebrash/internal/drawers/<kind>.go`.
5. If PNG looks right but SVG is wrong: the bug is almost always either
   (a) the SVG drawer's geometry has drifted from its canvas sibling, or
   (b) `SvgEmitter.save`/`restore` bookkeeping. Check the `<g>` open/close
   count in the output before suspecting a per-element issue.
6. If only pixel-level (subpixel offsets, antialiasing): probably rasterizer
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
