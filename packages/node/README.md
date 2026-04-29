# @zebrash/node

[![npm version](https://img.shields.io/npm/v/@zebrash/node?color=cb3837&logo=npm)](https://www.npmjs.com/package/@zebrash/node)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Render [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language) labels
to PNG or SVG on Node.js and Bun. Pure-TypeScript port of
[ingridhq/zebrash](https://github.com/ingridhq/zebrash). Rasterizes via
[`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) (Skia) — no system
Cairo, no native build step. A free, local alternative to
[labelary.com/viewer.html](https://labelary.com/viewer.html).

## Install

```bash
npm install @zebrash/node
```

`@napi-rs/canvas` ships prebuilt Skia binaries for macOS, Linux, and Windows on
both x64 and arm64.

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
});

await writeFile("./label.png", png);
```

A single `^XA…^XZ` block produces one `LabelInfo`. Multi-label ZPL with
`^DF`/`^XF` template recall produces several — iterate the array.

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

## Browser?

Use [`@zebrash/browser`](https://www.npmjs.com/package/@zebrash/browser) — same
API, `OffscreenCanvas` instead of Skia, zero native deps.

## Documentation

Full docs, supported ZPL command surface, and the `DrawerOptions` reference
live in the [main README](https://github.com/Fountain-Bio/zebrash-ts#readme).

## License

MIT.
