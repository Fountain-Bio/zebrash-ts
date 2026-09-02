# zebrash ZPL viewer

An editor-first browser demo for `@zebrash/browser`. It renders ZPL entirely
in the browser and supports:

- debounced PNG and SVG previews
- label size, print density, inversion, grayscale, and SVG font controls
- navigation through multi-label ZPL
- PNG and SVG downloads, plus a PDF export of the previewed label
- a single-screen layout: the panels fit the viewport and scroll internally
- repository fixtures as examples
- shareable links with the source and settings encoded in the URL fragment

The PDF holds the rendered raster on a page sized to the label's physical
dimensions, so printing it at 100 % scale produces a correctly sized label.
`src/pdf.js` writes the file directly and has no third-party dependency.

ZPL source never leaves the browser. By default, the renderer fetches its four
fonts from jsDelivr; label contents are not included in those requests.

## Local development

Build the workspace packages before starting Vite because the example consumes
their compiled output:

```bash
bun install
bun run build
bun run --cwd examples dev
```

Open <http://127.0.0.1:5173>.

## Production build

```bash
bun run build
bun run --cwd examples build
```

The static site is written to `examples/dist`. Asset URLs default to the domain
root. Set `VITE_BASE_PATH` when building for a repository subpath:

```bash
VITE_BASE_PATH=/zebrash-ts/ bun run --cwd examples build
```

The `Deploy browser demo` GitHub Actions workflow publishes this directory
whenever relevant files change on `main`. The repository's Pages source must be
set to **GitHub Actions** once in the repository settings.
