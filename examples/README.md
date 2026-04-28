# zebrash · fixture viewer

Browser-side example app. Renders every ZPL fixture in `test/fixtures/` using
the same source code that ships in the npm package, side-by-side with the Go
reference PNG for visual comparison.

```bash
cd examples
bun install   # or npm install
bun run dev   # vite at http://127.0.0.1:5173
```

Open the URL in any browser. Pick a fixture from the sidebar (or filter by
name) — the left pane is the live browser render, the right is the Go
reference. The current fixture is reflected in `location.hash` so you can
share or bookmark a specific one.

## How it's wired

- `package.json` depends on `zebrash` via `"file:.."` — the example consumes
  the same built output (`../dist/`) that npm publishes. Vite picks up the
  `package.json` `"browser"` field automatically and swaps in the
  browser-platform entry. **Run `bun run build` in the repo root after editing
  source.**
- Fixtures are loaded with vite's `import.meta.glob` from `../test/fixtures/`
  — `?raw` for the ZPL, `?url` for the reference PNG. No middleware, no
  manifest file, no symlink.
- Bundled TTFs are lazy-fetched from jsdelivr on first text render. Override
  via `setFontBaseUrl()` if you need self-hosted fonts.
