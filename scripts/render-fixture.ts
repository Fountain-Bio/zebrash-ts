#!/usr/bin/env bun
/**
 * CLI: render a ZPL fixture (or any ZPL file) to PNG using @zebrash/node.
 *
 * Usage:
 *   bun run scripts/render-fixture.ts test/fixtures/amazon.zpl > out.png
 *   bun run scripts/render-fixture.ts test/fixtures/amazon.zpl --out /tmp/amazon.png
 *
 * Run `bun run build` first — this script imports the built artifact.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { stdout } from "node:process";

import { type DrawerOptions, loadRenderApi } from "../test/helpers.js";

interface CliArgs {
  input: string;
  out: string | undefined;
  labelIndex: number;
  options: DrawerOptions;
}

function parseArgs(argv: string[]): CliArgs {
  const args: string[] = argv.slice(2);
  let input: string | undefined;
  let out: string | undefined;
  let labelIndex = 0;
  const options: DrawerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--out" || arg === "-o") {
      out = args[++i];
    } else if (arg === "--label-index") {
      labelIndex = Number.parseInt(args[++i] ?? "0", 10);
    } else if (arg === "--width-mm") {
      options.labelWidthMm = Number.parseFloat(args[++i] ?? "0");
    } else if (arg === "--height-mm") {
      options.labelHeightMm = Number.parseFloat(args[++i] ?? "0");
    } else if (arg === "--dpmm") {
      options.dpmm = Number.parseInt(args[++i] ?? "8", 10);
    } else if (arg === "--inverted") {
      options.enableInvertedLabels = true;
    } else if (arg === "--grayscale") {
      options.grayscaleOutput = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else if (!arg?.startsWith("-")) {
      if (input === undefined) input = arg;
    } else {
      throw new Error(`unknown flag: ${arg}`);
    }
  }

  if (!input) {
    printUsage();
    throw new Error("missing input zpl path");
  }

  return { input, out, labelIndex, options };
}

function printUsage(): void {
  process.stderr.write(
    [
      "Usage: bun run scripts/render-fixture.ts <input.zpl> [options]",
      "",
      "Options:",
      "  --out, -o <path>      write PNG to <path> (default: stdout)",
      "  --label-index <n>     render the n-th label (default: 0)",
      "  --width-mm <mm>       label width in mm",
      "  --height-mm <mm>      label height in mm",
      "  --dpmm <n>            dots per mm (default: 8)",
      "  --inverted            enable inverted-label rendering",
      "  --grayscale           emit 8-bit grayscale instead of monochrome",
      "  --help, -h            show this help",
      "",
    ].join("\n"),
  );
}

async function main(): Promise<void> {
  const { input, out, labelIndex, options } = parseArgs(process.argv);

  const api = await loadRenderApi();
  if (!api) {
    throw new Error(
      "@zebrash/node could not be resolved. Run `bun run build` from the repo root first.",
    );
  }

  const zpl = readFileSync(resolve(input));
  const parser = new api.Parser();
  const labels = await parser.parse(zpl);
  if (labels.length === 0) {
    throw new Error(`no labels parsed from ${input}`);
  }
  if (labelIndex < 0 || labelIndex >= labels.length) {
    throw new Error(`label index ${labelIndex} out of range (parsed ${labels.length} label(s))`);
  }
  const label = labels[labelIndex];
  if (!label) {
    throw new Error(`label at index ${labelIndex} is undefined`);
  }

  const drawer = new api.Drawer();
  const png = await drawer.drawLabelAsPng(label, options);
  const buffer = Buffer.isBuffer(png) ? png : Buffer.from(png);

  if (out) {
    writeFileSync(resolve(out), buffer);
    process.stderr.write(`wrote ${buffer.byteLength} bytes to ${out}\n`);
  } else {
    stdout.write(buffer);
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`render-fixture: ${message}\n`);
  process.exit(1);
});
