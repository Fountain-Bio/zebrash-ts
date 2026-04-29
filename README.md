# zebrash (TypeScript port)

A TypeScript port of [ingridhq/zebrash](https://github.com/ingridhq/zebrash) — a
library that renders [ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language)
labels (the dialect spoken by Zebra printers) as PNG **or SVG**.

Two published packages — pick by runtime:

- **`@zebrash/node`** — for Node (≥ 24) and Bun. Rasterizes via
  [`@napi-rs/canvas`](https://github.com/Brooooooklyn/canvas) (Skia).
- **`@zebrash/browser`** — for browsers. Uses native `OffscreenCanvas` +
  `FontFace`. Zero native deps.

Both expose the same `Parser` / `Drawer` / `LabelInfo` / `DrawerOptions`
public API. There is no WASM, no Go subprocess, and no native build step.

A free, local alternative to [labelary.com/viewer.html](https://labelary.com/viewer.html):
the same preview, without sending label data to a third party.

## Status

The port is complete. The 60 ZPL fixtures carried over from the upstream Go
reference suite all render within 5 % pixel diff of the Go output, with two
documented exceptions at 6 % attributable to Skia-vs-FreeType antialiasing
drift.

## Install

For Node / Bun:

```bash
bun add @zebrash/node
# or
npm install @zebrash/node
```

`@napi-rs/canvas` ships prebuilt Skia binaries for macOS, Linux, and Windows
on both x64 and arm64; no system Cairo or build toolchain is required.

For the browser:

```bash
bun add @zebrash/browser
# or
npm install @zebrash/browser
```

The four bundled TTF fonts are lazy-fetched from jsdelivr on first render.
To self-host them — for CSP, offline, or version-pinning reasons — override
the base URL with `setFontBaseUrl`:

```ts
import { Parser, Drawer, setFontBaseUrl } from "@zebrash/browser";

setFontBaseUrl("/static/zebrash-fonts/"); // optional

const labels = new Parser().parse(zpl);
const png = await new Drawer().drawLabelAsPng(labels[0]);
```

`drawLabelAsPng` returns a `Uint8Array`. In the browser, wrap it in a `Blob`
for `URL.createObjectURL` or for an anchor-tag download.

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

A single `^XA…^XZ` block produces one `LabelInfo`. Multi-label ZPL that uses
`^DF`/`^XF` template recall produces several; iterate the array and render
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

Approximate sizes for a typical text-heavy label using DejaVu:

| Mode      | SVG size  |
| --------- | --------- |
| `"none"`  | ~10–50 KB |
| `"url"`   | ~10–50 KB |
| `"embed"` | +900 KB   |

`grayscaleOutput` is ignored for `drawLabelAsSvg` — it's a PNG-encoder
concern. Reverse-print elements (`^FR`) are wrapped in a
`<g style="mix-blend-mode: difference">` group, which is mathematically
equivalent to the XOR composite the PNG path uses for monochrome output.

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

## Architecture

```
ZPL bytes ──► Parser ──► [elements]  ──► Drawer ──► PNG bytes
              (parsers/)  (elements/)    (drawers/, barcodes/, images/)
```

The repo is a bun-workspaces monorepo. All engine code lives in `@zebrash/core`:

- `packages/core/src/parsers/` — one parser per `^XX` command (~30 in total).
- `packages/core/src/elements/` — typed shapes for each label-element kind.
- `packages/core/src/drawers/` — paints each element onto a canvas context.
- `packages/core/src/svg-drawers/` — emits each element as native SVG
  primitives (parallel to `drawers/`, used by `drawLabelAsSvg`).
- `packages/core/src/svg/` — `SvgEmitter` (the canvas-context analog) and
  the `@font-face` builder.
- `packages/core/src/barcodes/` — encoders for nine barcode symbologies
  (pure data → bit pattern; no canvas dependency).
- `packages/core/src/images/` — color constants, PNG encoding (monochrome
  and grayscale), and reverse-print compositing.
- `packages/core/src/printers/` — the `VirtualPrinter` state machine
  threaded across `^FS`-separated fields.
- `packages/core/src/assets/` — bundled TTF fonts (Helvetica Bold Condensed,
  DejaVu Sans Mono ± bold, ZPL GS shape font).
- `packages/core/src/platform/` — Node + browser canvas / font / encoding
  backends, selected via the core package's `"browser"` field.
- `packages/core/src/parser.ts` and `drawer.ts` — the top-level public API.

`packages/node/` and `packages/browser/` are thin re-export wrappers that
add the runtime-appropriate dependencies (or the absence of them).

## Development

```bash
bun install
bun run typecheck    # tsc -b --noEmit across all packages
bun run lint         # oxlint
bun run format       # oxfmt (use format:check in CI)
bun run test         # vitest: core unit + Node golden suite (auto-builds first)
bun run test:browser # vitest in real Chromium: browser golden suite
bun run test:all     # all three projects
bun run build        # tsc -b across packages/{core,node,browser}
```

### Visual debugging

The `examples/` directory is a workspace member — a Vite app that renders
every fixture in the browser side-by-side with the Go reference, depending
on `@zebrash/browser` via `workspace:*`. After a build:

```bash
bun run build
bun run --cwd examples dev
# http://127.0.0.1:5173
```

### Visual debugging (CLI)

Render a fixture to a temp file and inspect it:

```bash
bun run scripts/render-fixture.ts test/fixtures/amazon.zpl --out /tmp/amazon.png
open /tmp/amazon.png
```

The script accepts `--width-mm`, `--height-mm`, `--dpmm`, `--inverted`,
`--grayscale`, `--label-index` (for multi-label ZPL), and `--svg` (with
optional `--font-embed url|embed|none`) for SVG output.

### Adding a fixture

Drop `your_label.zpl` and its Go-rendered reference `your_label.png` into
`test/fixtures/`. The golden suite at `test/golden.test.ts` picks it up on
the next run. If the canvas needs a non-default size, add an entry to
`FIXTURE_OPTIONS`, which mirrors the per-fixture options in Go's
`parser_test.go`.

### Releasing

Bump locally; let CI publish via [npm OIDC trusted
publishing](https://docs.npmjs.com/trusted-publishers)

```bash
bun run release 0.2.0
git push origin main && git push origin v0.2.0
```

`bun run release <version>` validates semver, refuses to run with a dirty
tree or off `main`, bumps all three `@zebrash/*` `package.json` files to
the same version (lockstep), runs `oxfmt`, then commits and tags `vX.Y.Z`.
It does **not** push — review the commit first, then push the branch and
tag. The tag push triggers `.github/workflows/release-publish.yml`, which
rebuilds, runs the full test suite, and `npm publish`es all three packages.

**One-time npm setup** — for each of `@zebrash/core`, `@zebrash/node`,
`@zebrash/browser`:

1. Package settings on npmjs.com → **Trusted publishing → Add publisher**.
2. Provider: **GitHub Actions**.
3. Organization or user: `Fountain-Bio` · Repository: `zebrash-ts` ·
   Workflow filename: `release-publish.yml` · Environment: blank.

If the package doesn't exist on npm yet (first-ever release), publish it
manually once with your own npm credentials, then register the trusted
publisher and switch all subsequent releases to the workflow.

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
