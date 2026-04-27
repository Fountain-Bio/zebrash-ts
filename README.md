# zebrash (TypeScript port)

Pure TypeScript port of [ingridhq/zebrash](https://github.com/ingridhq/zebrash) — a library that renders [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language) (Zebra printer) labels as PNG images.

**Status:** in-progress port. Not yet usable. Tracking parity against the Go reference at `../zebrash`.

## Goals

- Pure TypeScript (no WASM, no CGo, no Go subprocess)
- Runs on Node.js ≥ 20 and Bun
- Uses [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) for 2D rendering
- Bundled embedded fonts (Helvetica Bold Condensed, DejaVu Sans Mono, ZPL GS)
- Test fixtures parity with the Go repo (`test/fixtures/`)

## Usage (planned)

```ts
import { readFile, writeFile } from "node:fs/promises";
import { Parser, Drawer } from "zebrash";

const zpl = await readFile("./label.zpl");
const labels = new Parser().parse(zpl);
const png = await new Drawer().drawLabelAsPng(labels[0], {
  labelWidthMm: 101.6,
  labelHeightMm: 203.2,
  dpmm: 8,
  enableInvertedLabels: true,
  grayscaleOutput: true,
});
await writeFile("./label.png", png);
```

## Development

```bash
bun install
bun run typecheck
bun run lint
bun run test
```

## License

MIT — same as the Go original.
