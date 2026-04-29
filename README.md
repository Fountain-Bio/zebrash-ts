# zebrash (TypeScript port)

[![CI](https://github.com/Fountain-Bio/zebrash-ts/actions/workflows/ci.yml/badge.svg)](https://github.com/Fountain-Bio/zebrash-ts/actions/workflows/ci.yml)
[![@zebrash/node on npm](https://img.shields.io/npm/v/@zebrash/node?label=%40zebrash%2Fnode&color=cb3837&logo=npm)](https://www.npmjs.com/package/@zebrash/node)
[![@zebrash/browser on npm](https://img.shields.io/npm/v/@zebrash/browser?label=%40zebrash%2Fbrowser&color=cb3837&logo=npm)](https://www.npmjs.com/package/@zebrash/browser)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A TypeScript port of [ingridhq/zebrash](https://github.com/ingridhq/zebrash) — a
library that renders [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language)
labels (the dialect spoken by Zebra printers) as PNG **or SVG**. A free, local
alternative to [labelary.com/viewer.html](https://labelary.com/viewer.html) —
the same preview, without sending label data to a third party.

Two published packages — pick by runtime:

- **`@zebrash/node`** — Node (≥ 24) and Bun. Rasterizes via
  [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) (Skia).
- **`@zebrash/browser`** — browsers. Uses native `OffscreenCanvas` +
  `FontFace`. Zero native deps.

Both expose the same `Parser` / `Drawer` / `LabelInfo` / `DrawerOptions`
public API. No WASM, no Go subprocess, no native build step.

## Install

```bash
# Node / Bun
npm install @zebrash/node

# Browser
npm install @zebrash/browser
```

`@napi-rs/canvas` ships prebuilt Skia binaries for macOS, Linux, and Windows
on both x64 and arm64 — no system Cairo or build toolchain is required.

In the browser, the four bundled TTF fonts are lazy-fetched from jsdelivr on
first render. To self-host them (CSP, offline, version-pinning), override the
base URL:

```ts
import { setFontBaseUrl } from "@zebrash/browser";
setFontBaseUrl("/static/zebrash-fonts/");
```

## Usage

```ts
import { readFile, writeFile } from "node:fs/promises";
import { Parser, Drawer } from "@zebrash/node";

const zpl = await readFile("./label.zpl");
const labels = new Parser().parse(zpl);

const png = await new Drawer().drawLabelAsPng(labels[0], {
  labelWidthMm: 101.6, // 4 in
  labelHeightMm: 203.2, // 8 in
  dpmm: 8, // 203 dpi
  enableInvertedLabels: true,
  grayscaleOutput: false,
});

await writeFile("./label.png", png);
```

`drawLabelAsPng` returns a `Uint8Array`. In the browser, wrap it in a `Blob`
for `URL.createObjectURL` or an anchor-tag download.

A single `^XA…^XZ` block produces one `LabelInfo`. Multi-label ZPL that uses
`^DF`/`^XF` template recall produces several — iterate the array and render
each.

### SVG output

For an `<svg>` document instead of a PNG buffer, call `drawLabelAsSvg`:

```ts
const svg = await new Drawer().drawLabelAsSvg(labels[0], {
  labelWidthMm: 101.6,
  labelHeightMm: 203.2,
  dpmm: 8,
  fontEmbed: "url", // "url" | "embed" | "none"
});
```

It returns a `Promise<string>`. Real `<rect>` per barcode module, real
`<text>` per `^FD` field, and a single embedded `<image>` only for `^GF`
bitmaps (no other path requires raster).

`fontEmbed` controls how the SVG references the bundled TTFs:

| Mode      | What it emits                                                             | When to use it                                                                                                    |
| --------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `"url"`   | `@font-face src: url("<cdn>/font.ttf")` — same CDN as the runtime loader. | **Default.** Browser embedding; small file size; CDN fetches once and caches.                                     |
| `"embed"` | `@font-face src: url("data:font/ttf;base64,…")`                           | Offline / PDF-export / portable archive use cases. Adds ~54 KB (Helvetica only) to ~900 KB (DejaVu pair) per SVG. |
| `"none"`  | `font-family` attribute only, no `@font-face`.                            | Renderer already has the fonts (test harness, host system). Smallest output.                                      |

Reverse-print elements (`^FR`) are wrapped in a
`<g style="mix-blend-mode: difference">` group, mathematically equivalent to
the XOR composite the PNG path uses for monochrome output. `grayscaleOutput`
is ignored for SVG — it's a PNG-encoder concern.

## Supported ZPL surface

| Category          | Commands                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Field positioning | `^FO`, `^FT`, `^FB`, `^FS`, `^FW`, `^FN`, `^FR`, `^FH`, `^FV`, `^FD`                                                                                                              |
| Label setup       | `^XA`, `^XZ`, `^LH`, `^LR`, `^PW`, `^PO`, `^CC`, `~CT`                                                                                                                            |
| Fonts             | `^A`, `^CF`, `^CW`, `^CI` (charsets 0–13, 27)                                                                                                                                     |
| Graphics          | `^GB`, `^GC`, `^GD`, `^GF`, `^GS`                                                                                                                                                 |
| Templating        | `^DF`, `^XF`, `~DG`, `^XG`, `^IL`                                                                                                                                                 |
| Custom fonts      | `~DU`, font alias via `^CW`                                                                                                                                                       |
| Barcodes          | `^BC` (Code 128), `^B2` (Interleaved 2 of 5), `^B3` (Code 39), `^B7` (PDF417), `^BD` (Maxicode), `^BE` (EAN-13), `^BO` (Aztec), `^BQ` (QR), `^BX` (Data Matrix), `^BY` (defaults) |
| Output            | Monochrome PNG (default), 8-bit grayscale, inverted-label compositing, `^FR` reverse-print, vector SVG (`drawLabelAsSvg`)                                                         |

## Development

```bash
bun install
bun run typecheck    # tsc -b across packages
bun run lint         # oxlint
bun run test         # core unit + Node golden suite
bun run test:browser # browser golden suite (real Chromium)
bun run build        # tsc -b across packages/{core,node,browser}
```

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
