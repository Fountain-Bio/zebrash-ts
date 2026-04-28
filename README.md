# zebrash (TypeScript port)

A TypeScript port of [ingridhq/zebrash](https://github.com/ingridhq/zebrash) — a
library that renders [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language)
labels (the dialect spoken by Zebra printers) as PNG images.

The library runs in both Node (≥ 20) and Bun, where it rasterizes via
[`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) (Skia), and in the
browser, where it uses native `OffscreenCanvas` and `FontFace`. Bundlers
select the right implementation through the `package.json` `"browser"` field.
There is no WASM, no Go subprocess, and no native build step.

A free, local alternative to [labelary.com/viewer.html](https://labelary.com/viewer.html):
the same preview, without sending label data to a third party.

## Status

The port is complete. The 60 ZPL fixtures carried over from the upstream Go
reference suite all render within 5 % pixel diff of the Go output, with two
documented exceptions at 6 % attributable to Skia-vs-FreeType antialiasing
drift.

## Install

```bash
npm install zebrash
# or
bun add zebrash
```

On Node and Bun, `@napi-rs/canvas` ships prebuilt Skia binaries for macOS,
Linux, and Windows on both x64 and arm64; no system Cairo or build toolchain
is required.

In the browser, the four bundled TTF fonts are lazy-fetched from jsdelivr on
first render. To self-host them — for CSP, offline, or version-pinning
reasons — override the base URL with `setFontBaseUrl`:

```ts
import { Parser, Drawer, setFontBaseUrl } from "zebrash";

setFontBaseUrl("/static/zebrash-fonts/"); // optional

const labels = new Parser().parse(zpl);
const png = await new Drawer().drawLabelAsPng(labels[0]);
```

`drawLabelAsPng` returns a `Uint8Array`. In the browser, wrap it in a `Blob`
for `URL.createObjectURL` or for an anchor-tag download.

## Usage

```ts
import { readFile, writeFile } from "node:fs/promises";
import { Parser, Drawer } from "zebrash";

const zpl = await readFile("./label.zpl");
const labels = new Parser().parse(zpl);

const png = await new Drawer().drawLabelAsPng(labels[0], {
  labelWidthMm: 101.6,   // 4 in
  labelHeightMm: 203.2,  // 8 in
  dpmm: 8,               // 203 dpi
  enableInvertedLabels: true,
  grayscaleOutput: false,
});

await writeFile("./label.png", png);
```

A single `^XA…^XZ` block produces one `LabelInfo`. Multi-label ZPL that uses
`^DF`/`^XF` template recall produces several; iterate the array and render
each.

## Supported ZPL surface

| Category          | Commands                                                                                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field positioning | `^FO`, `^FT`, `^FB`, `^FS`, `^FW`, `^FN`, `^FR`, `^FH`, `^FV`, `^FD`                                                                                                  |
| Label setup       | `^XA`, `^XZ`, `^LH`, `^LR`, `^PW`, `^PO`, `^CC`, `~CT`                                                                                                                |
| Fonts             | `^A`, `^CF`, `^CW`, `^CI` (charsets 0–13, 27)                                                                                                                         |
| Graphics          | `^GB`, `^GC`, `^GD`, `^GF`, `^GS`                                                                                                                                     |
| Templating        | `^DF`, `^XF`, `~DG`, `^XG`, `^IL`                                                                                                                                     |
| Custom fonts      | `~DU`, font alias via `^CW`                                                                                                                                           |
| Barcodes          | `^BC` (Code 128), `^B2` (Interleaved 2 of 5), `^B3` (Code 39), `^B7` (PDF417), `^BD` (Maxicode), `^BE` (EAN-13), `^BO` (Aztec), `^BQ` (QR), `^BX` (Data Matrix), `^BY` (defaults) |
| Output            | Monochrome PNG (default), 8-bit grayscale, inverted-label compositing, `^FR` reverse-print                                                                            |

## Architecture

```
ZPL bytes ──► Parser ──► [elements]  ──► Drawer ──► PNG bytes
              (parsers/)  (elements/)    (drawers/, barcodes/, images/)
```

- `src/parsers/` — one parser per `^XX` command (~30 in total).
- `src/elements/` — typed shapes for each label-element kind.
- `src/drawers/` — paints each element onto a canvas context.
- `src/barcodes/` — encoders for nine barcode symbologies (pure data → bit
  pattern; no canvas dependency).
- `src/images/` — color constants, PNG encoding (monochrome and grayscale),
  and reverse-print compositing.
- `src/printers/` — the `VirtualPrinter` state machine threaded across
  `^FS`-separated fields.
- `src/assets/` — bundled TTF fonts (Helvetica Bold Condensed, DejaVu Sans
  Mono ± bold, ZPL GS shape font).
- `src/parser.ts` and `src/drawer.ts` — the top-level public API.

## Development

```bash
bun install
bun run typecheck   # tsc --noEmit
bun run lint        # oxlint
bun run format      # oxfmt (use format:check in CI)
bun run test        # vitest: unit + golden suites
bun run build       # emits dist/
```

### Visual debugging

Render a fixture to a temp file and inspect it:

```bash
bun run scripts/render-fixture.ts test/fixtures/amazon.zpl --out /tmp/amazon.png
open /tmp/amazon.png
```

The script accepts `--width-mm`, `--height-mm`, `--dpmm`, `--inverted`,
`--grayscale`, and `--label-index` (for multi-label ZPL).

### Adding a fixture

Drop `your_label.zpl` and its Go-rendered reference `your_label.png` into
`test/fixtures/`. The golden suite at `test/golden.test.ts` picks it up on
the next run. If the canvas needs a non-default size, add an entry to
`FIXTURE_OPTIONS`, which mirrors the per-fixture options in Go's
`parser_test.go`.

## Pixel-diff tolerance

Skia (used by `@napi-rs/canvas`) and FreeType (used by the Go reference)
produce slightly different antialiasing along glyph edges. With element-level
correctness in place, pixel diff against the Go reference settles at roughly
0–5 % across most fixtures. The golden threshold defaults to 5 %; two
fixtures (`templating` and `ups_grayscale`) carry documented overrides at 6 %.

## Provenance

- The public API, parser command set, drawer dispatch, and ZPL semantics are
  ported from [ingridhq/zebrash](https://github.com/ingridhq/zebrash) (MIT).
- The barcode encoders are TypeScript ports of:
  - PDF417, Aztec, Interleaved 2 of 5, EAN-13 — from
    [boombuler/barcode](https://github.com/boombuler/barcode)
  - Code 128, Code 39, QR Code, Data Matrix — from
    [makiuchi-d/gozxing](https://github.com/makiuchi-d/gozxing)
  - Maxicode — from [ingridhq/maxicode](https://github.com/ingridhq/maxicode)

## License

MIT.
