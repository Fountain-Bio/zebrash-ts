# Integration status

This branch (`integration`) merges the 24 parallel `port/u*` branches into a
single tree. The integration brought:

- **407 → ~186 typecheck errors** (54 % reduction) via automated naming
  reconciliation
- **All 24 units' source files** in their canonical locations under `src/`
- **Public surface wired** in `src/index.ts` (Parser, Drawer, DrawerOptions, LabelInfo)
- **Unified tsconfig** with `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`
  so both `.ts` and `.js` relative imports work

## What was done

1. Standardised `tsconfig.json` to allow `.ts` extensions on relative imports.
2. Pulled each unit's primary directory verbatim into the integration branch.
3. Lowercased Go-style PascalCase property names (~450 substitutions) so the
   element types match the camelCase convention used by parsers, drawers,
   printers, and tests:
   - `font.Name → font.name`, `position.X → position.x`, `info.Width → info.width`,
     `field.ReversePrint → field.reversePrint`, `format.Inverted → format.inverted`,
     and many more
   - Class methods: `RecalledFormat.AddElement → addElement`, `ResolveElements → resolveElements`
   - CommandParser fields: `CommandCode → commandCode`, `Parse → parse`
4. Added factories and helpers that consumers expected but the original units
   didn't define centrally:
   - `newFontInfo`, `newLabelPosition`, `reversePrint(value)`
   - `LineColorBlack`, `LineColorWhite`, `BarcodeModeNo/Ucc/Automatic/Ean`
   - `colorWhite`, `colorBlack` lowercase aliases on `images`
   - `parseStrictInt`, `parseInt10`, `parseFloatTrimmed`, `splitN` on `command_parser`
   - `BitList.toBitString()`, `BitList.toArray()`, `BitList.length` getter
   - `BitList()` constructor now defaults `capacity = 0`
   - `rotateForOrientation(ctx, w, h, pos, ori)` on `element_drawer`
5. Repaired qrcode hyphenated import paths (worker used `bit-array.ts` etc.,
   actual files are `bit_array.ts`).

## What still needs work (~186 errors remaining)

The remaining errors fall into a long tail of small inconsistencies the workers
introduced because they each stubbed cross-unit dependencies independently. The
inventory:

| Category | Approx count | Fix |
|---|---|---|
| Element fields still PascalCase in producers (`Line`, `LineAbove`, `CheckDigit`, `TotalBytes`, `RowBytes`, `CornerRounding`, `TopToBottom`, `Code`, `Size`, `Height` on a few barcode subtypes) | ~30 | Extend the naming script's PROPS list and re-run |
| `_kind` vs `kind` discriminator (some drawers use `kind:` to construct elements) | ~10 | sed `s/\\bkind:/_kind:/g` in `src/drawers/*.ts` |
| `SKRSContext2D` vs `Canvas` argument type mismatch (image utilities expect `Canvas`, drawers pass `ctx`) | ~6 | Widen `images/{encode,reversePrint,zerofill}` parameter types to accept either |
| `parseFloatTrimmed`/`toPositiveIntField` return-shape mismatch (some callers treat the return as a number, others destructure `{value, ok}`) | ~12 | Pick one shape; adapt callers |
| Consumer encoder names mismatching exports (`encodeCode128Auto` vs `EncodeAuto`, `encodeInterleaved2of5` vs `encodeInterleaved`, etc.) | ~10 | Add named-export aliases in barcode-encoder `index.ts` files |
| `BitArray.length` getter missing | 2 | Add a `get length(): number` mirror of `BitList`'s |
| `CustomFontFamily` not on `FontInfo` (text drawer expects it for downloaded TTFs) | 3 | Add optional `customFontFamily?: string` to FontInfo |
| `addLabelPositions` (plural) vs `addLabelPosition` | 2 | Rename or add alias |
| Test fixtures expect ports to use specific factory names (`newVirtualPrinter`, `newFontInfo`) | 4 | Already added; check each call site |
| `BitMatrix.width` private (some consumers read it) | 1 | Add a `get width()` accessor |
| `StoredFormat.ToRecalledFormat` vs `storedFormatToRecalled` (parsers call .ToRecalledFormat) | 1 | Add a method alias on the type |
| Test data shapes (test files pass slightly wrong shapes) | ~10 | Trivial test fixups |

Total remaining work: ~2–3 focused hours of mechanical editing, no algorithm
changes required. The cleanest path is:

1. Extend `/tmp/lowercase_props.py` with the missing PROPS, re-run
2. Add the named-export aliases listed above
3. Reconcile the `parseFloatTrimmed` return shape (camelCase variant returns
   `number | null`; CamelCase variant returns `{value, ok}`)
4. Run `bun run typecheck && bun run test`

## How to inspect any unit's original work

Each unit's branch is preserved in `.worktrees/u<NN>-<title>` and on a `port/u<NN>-*`
branch. To compare what the integration has vs what a unit produced:

```bash
git diff port/u01-elements integration -- src/elements/
```

## Known good

- All 24 units typechecked, linted, and tested green inside their own
  worktrees before the integration. The remaining errors are integration
  artifacts (interface mismatches), not bugs in the per-unit code itself.
- Foundation modules (elements, hex, encodings, images, assets, printers,
  barcodes/utils) are solid and likely run correctly.
- Pure encoders (code128, code39, twooffive, ean13, qrcode, pdf417, aztec,
  datamatrix, maxicode) compile in isolation and have ~150 unit tests
  covering known patterns.
