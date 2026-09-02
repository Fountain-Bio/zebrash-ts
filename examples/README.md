# zebrash ZPL viewer

An editor-first browser demo for `@zebrash/browser`. It renders ZPL entirely
in the browser and supports:

- debounced PNG and SVG previews
- label size, print density, inversion, grayscale, and SVG font controls
- navigation through multi-label ZPL
- PNG and SVG downloads
- repository fixtures as examples
- shareable links with the source and settings encoded in the URL fragment

ZPL source never leaves the browser. By default, the renderer fetches its four
fonts from jsDelivr; label contents are not included in those requests.

## Local development

Build the workspace packages before starting Vite because the example consumes
their compiled output:

```bash
bun install
bun run build
bun run dev --cwd examples
```

Open <http://127.0.0.1:5173>.

## Production build

```bash
bun run build
bun run build --cwd examples
```

The static site is written to `examples/dist`. Asset URLs default to the domain
root. Set `VITE_BASE_PATH` when building for a repository subpath:

```bash
VITE_BASE_PATH=/zebrash-ts/ bun run build --cwd examples
```

The `Deploy browser demo` GitHub Actions workflow publishes this directory
whenever relevant files change on `main`. The repository's Pages source must be
set to **GitHub Actions** once in the repository settings.
