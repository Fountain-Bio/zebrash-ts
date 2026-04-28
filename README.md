# zebrash (TypeScript port)

TypeScript port of [ingridhq/zebrash](https://github.com/ingridhq/zebrash) — a
library that renders [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language)
(Zebra printer) labels as PNG images.

The library code itself is pure TypeScript (no WASM, no Go subprocess, no
CGo). 2D rasterization runs on [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas),
which is a native Skia binding with prebuilt binaries — `npm install` and go.

> Think of [labelary.com/viewer.html](https://labelary.com/viewer.html), except
> it's free for commercial use, runs locally, and doesn't ship your customer
> data to a third party.

## Status

Working. **451 / 451 tests pass.** All 60 ZPL fixtures from the Go reference
suite render with ≤ 5 % pixel diff against the Go output (with three documented
overrides at 6 % for legitimate Skia-vs-FreeType antialiasing drift).

## Install

```bash
npm install zebrash
# or
bun add zebrash
```

Requires Node.js ≥ 20 (or Bun ≥ 1.0). `@napi-rs/canvas` ships prebuilt Skia
binaries for macOS / Linux / Windows on x64 and arm64 — no system Cairo or
build toolchain required.

## Usage

```ts
import { readFile, writeFile } from "node:fs/promises";
import { Parser, Drawer } from "zebrash";

const zpl = await readFile("./label.zpl");
const labels = new Parser().parse(zpl);

const png = await new Drawer().drawLabelAsPng(labels[0], {
  labelWidthMm: 101.6, // 4 inches
  labelHeightMm: 203.2, // 8 inches
  dpmm: 8, // 203 dpi
  enableInvertedLabels: true,
  grayscaleOutput: false,
});

await writeFile("./label.png", png);
```

A single `^XA…^XZ` block produces one `LabelInfo`; multi-label ZPL with
`^DF`/`^XF` template recall produces multiple `LabelInfo`s — iterate and
render each.

## Supported ZPL surface

| Category          | Commands                                                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field positioning | `^FO`, `^FT`, `^FB`, `^FS`, `^FW`, `^FN`, `^FR`, `^FH`, `^FV`, `^FD`                                                                                                                                |
| Label setup       | `^XA`, `^XZ`, `^LH`, `^LR`, `^PW`, `^PO`, `^CC`, `~CT`                                                                                                                                              |
| Fonts             | `^A`, `^CF`, `^CW`, `^CI` (charsets 0–13, 27)                                                                                                                                                       |
| Graphics          | `^GB`, `^GC`, `^GD`, `^GF`, `^GS`                                                                                                                                                                   |
| Templating        | `^DF`, `^XF`, `~DG`, `^XG`, `^IL`                                                                                                                                                                   |
| Custom fonts      | `~DU`, font alias via `^CW`                                                                                                                                                                         |
| Barcodes          | `^BC` (Code 128), `^B2`/`^BI` (2 of 5), `^B3` (Code 39), `^B7` (PDF417), `^BC` (Code 128), `^BD`/`^MC` (Maxicode), `^BE` (EAN-13), `^BO` (Aztec), `^BQ` (QR), `^BX` (Data Matrix), `^BY` (defaults) |
| Output            | Monochrome PNG (default), 8-bit grayscale, inverted-label compositing, `^FR` reverse-print                                                                                                          |

## Architecture

```
ZPL bytes ──► Parser ──► [elements]  ──► Drawer ──► PNG bytes
              (parsers/)  (elements/)    (drawers/, barcodes/, images/)
```

- **`src/parsers/`** — one `^XX` command parser per file (~30 commands)
- **`src/elements/`** — typed shapes for each label element kind
- **`src/drawers/`** — paints each element type onto a `@napi-rs/canvas` context
- **`src/barcodes/`** — encoders for 9 barcode symbologies (pure logic, no canvas)
- **`src/images/`** — color constants, monochrome/grayscale PNG encode, reverse-print compositing
- **`src/printers/`** — `VirtualPrinter` state machine that survives across `^FS`-separated fields
- **`src/assets/`** — bundled TTF fonts (Helvetica Bold Condensed, DejaVu Sans Mono ±bold, ZPL GS shape font)
- **`src/parser.ts`** / **`src/drawer.ts`** — top-level public API

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run lint        # oxlint
bun run format      # oxfmt (use format:check in CI)
bun run test        # vitest: 391 unit + 60 golden = 451 tests
bun run build       # emits dist/
```

### Render a fixture for visual debugging

```bash
bun run scripts/render-fixture.ts test/fixtures/amazon.zpl --out /tmp/amazon.png
open /tmp/amazon.png
```

The script accepts `--width-mm`, `--height-mm`, `--dpmm`, `--inverted`,
`--grayscale`, and `--label-index` for multi-label ZPL.

### Adding a new fixture

Drop `your_label.zpl` plus its Go-rendered reference `your_label.png` into
`test/fixtures/`. The golden suite at `test/golden.test.ts` auto-discovers it
on the next run. If the canvas needs a non-default size, add an entry to
`FIXTURE_OPTIONS` (mirrors the Go `parser_test.go` per-fixture options).

## Pixel-diff tolerance

Skia (which `@napi-rs/canvas` uses) and FreeType (which the Go reference uses)
produce slightly different antialiasing on glyph edges. After element-level
correctness is achieved, pixel diff vs the Go reference settles at ~ 0–5 %
across most fixtures. The default golden threshold is 5 %; three fixtures
have documented per-fixture overrides (`templating`, `ups_grayscale`).

## Provenance

- Public-API surface, parser command set, drawer dispatch, and ZPL semantics
  are ported from [ingridhq/zebrash](https://github.com/ingridhq/zebrash) (MIT).
- Barcode encoders are TS ports of:
  - PDF417, Aztec, Code 2 of 5, EAN-13 — from
    [boombuler/barcode](https://github.com/boombuler/barcode)
  - Code 128, Code 39, QR Code, Data Matrix — from
    [makiuchi-d/gozxing](https://github.com/makiuchi-d/gozxing)
  - Maxicode — TS port of [ingridhq/maxicode](https://github.com/ingridhq/maxicode)

## License

MIT — same as the Go original.
