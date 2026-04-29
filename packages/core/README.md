# @zebrash/core

[![npm version](https://img.shields.io/npm/v/@zebrash/core?color=cb3837&logo=npm)](https://www.npmjs.com/package/@zebrash/core)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Internal engine for the `@zebrash` family — the
[ZPL II](https://en.wikipedia.org/wiki/Zebra_Programming_Language) parser,
drawer, and barcode encoders, plus a platform abstraction selected at bundle
time via the `"browser"` field in `package.json`.

> **End users should not import `@zebrash/core` directly.** It has no built-in
> rasterization backend. Pick the runtime-appropriate wrapper instead:
>
> - **Node / Bun:** [`@zebrash/node`](https://www.npmjs.com/package/@zebrash/node)
> - **Browser:** [`@zebrash/browser`](https://www.npmjs.com/package/@zebrash/browser)
>
> Both expose the same `Parser` / `Drawer` / `LabelInfo` / `DrawerOptions` API.

## Documentation

See the [main README](https://github.com/Fountain-Bio/zebrash-ts#readme) for
usage, supported ZPL commands, and the SVG-output reference.

## License

MIT.
