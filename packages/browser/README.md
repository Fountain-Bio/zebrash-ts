# @zebrash/browser

[![npm version](https://img.shields.io/npm/v/@zebrash/browser?color=cb3837&logo=npm)](https://www.npmjs.com/package/@zebrash/browser)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Render [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language) labels
to PNG or SVG in the browser. Pure-TypeScript port of
[ingridhq/zebrash](https://github.com/ingridhq/zebrash). Uses native
`OffscreenCanvas` + `FontFace`. Zero native deps, no WASM, no Go subprocess.
A free, local alternative to
[labelary.com/viewer.html](https://labelary.com/viewer.html) — preview labels
without sending data to a third party.

## Install

```bash
npm install @zebrash/browser
```

## Usage

```ts
import { Parser, Drawer } from "@zebrash/browser";

const labels = new Parser().parse(zpl);

const png = await new Drawer().drawLabelAsPng(labels[0], {
  labelWidthMm: 101.6, // 4 in
  labelHeightMm: 203.2, // 8 in
  dpmm: 8, // 203 dpi
});

const url = URL.createObjectURL(new Blob([png], { type: "image/png" }));
```

`drawLabelAsPng` returns a `Uint8Array`. Wrap it in a `Blob` for
`URL.createObjectURL` or an anchor-tag download.

## Fonts

The four bundled TTFs (Helvetica, DejaVu Sans Mono ± bold, ZPL GS) are
lazy-fetched from jsdelivr on first render. To self-host them (CSP, offline,
version-pinning), override the base URL:

```ts
import { setFontBaseUrl } from "@zebrash/browser";
setFontBaseUrl("/static/zebrash-fonts/");
```

## SVG output

```ts
const svg = await new Drawer().drawLabelAsSvg(labels[0], {
  labelWidthMm: 101.6,
  labelHeightMm: 203.2,
  dpmm: 8,
  fontEmbed: "url", // "url" | "embed" | "none"
});
```

Returns a `Promise<string>`. Real `<rect>` per barcode module, real `<text>`
per `^FD` field. Only `^GF` bitmaps fall back to embedded raster.

| `fontEmbed` | Emits                                           | When                                             |
| ----------- | ----------------------------------------------- | ------------------------------------------------ |
| `"url"`     | `@font-face src: url("<cdn>/font.ttf")`         | **Default.** Browser embedding, small file size. |
| `"embed"`   | `@font-face src: url("data:font/ttf;base64,…")` | Offline / PDF-export. Adds 54 KB–900 KB per SVG. |
| `"none"`    | `font-family` only, no `@font-face`             | Renderer already has fonts. Smallest output.     |

Reverse-print elements (`^FR`) are wrapped in
`<g style="mix-blend-mode: difference">` — XOR-equivalent for monochrome.

## Node.js?

Use [`@zebrash/node`](https://www.npmjs.com/package/@zebrash/node) — same API,
Skia-backed via `@napi-rs/canvas`.

## Documentation

Full docs, supported ZPL command surface, and the `DrawerOptions` reference
live in the [main README](https://github.com/Fountain-Bio/zebrash-ts#readme).

## License

MIT.
