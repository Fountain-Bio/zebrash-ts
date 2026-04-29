/**
 * Shared helpers for e2e + golden test suites and the render-fixture script.
 *
 * Imports the public API from `@zebrash/node` (the published wrapper), so the
 * tests exercise exactly what end users install. Run `bun run build` first —
 * `@zebrash/node` resolves to `packages/node/dist/`.
 */

import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

export const FIXTURES_DIR = resolve(HERE, "fixtures");

/** Mirror of Go's `elements.LabelInfo`. */
export interface LabelInfo {
  printWidth: number;
  inverted: boolean;
  elements: unknown[];
}

/** Mirror of Go's `drawers.DrawerOptions`. */
export interface DrawerOptions {
  labelWidthMm?: number;
  labelHeightMm?: number;
  dpmm?: number;
  enableInvertedLabels?: boolean;
  grayscaleOutput?: boolean;
}

export interface ParserLike {
  parse(zpl: Uint8Array | string): LabelInfo[] | Promise<LabelInfo[]>;
}

export interface DrawerLike {
  drawLabelAsPng(
    label: LabelInfo,
    options?: DrawerOptions,
  ): Buffer | Uint8Array | Promise<Buffer | Uint8Array>;
}

export interface RenderApi {
  Parser: new () => ParserLike;
  Drawer: new () => DrawerLike;
}

let cachedApi: RenderApi | null | undefined;

/**
 * Lazily resolve the public render API from `@zebrash/node`. Returns null
 * only if the package is not built (`bun run build` hasn't run yet).
 */
export async function loadRenderApi(): Promise<RenderApi | null> {
  if (cachedApi !== undefined) return cachedApi;
  try {
    const mod = (await import("@zebrash/node")) as Partial<RenderApi> & Record<string, unknown>;
    if (typeof mod.Parser === "function" && typeof mod.Drawer === "function") {
      cachedApi = { Parser: mod.Parser, Drawer: mod.Drawer };
    } else {
      cachedApi = null;
    }
  } catch {
    cachedApi = null;
  }
  return cachedApi;
}

function loadFixtureFile(name: string, extension: ".zpl" | ".png"): Buffer {
  const path = name.endsWith(extension) ? name : `${name}${extension}`;
  return readFileSync(resolve(FIXTURES_DIR, path));
}

export function loadFixture(name: string): Uint8Array {
  return loadFixtureFile(name, ".zpl");
}

export function loadFixturePng(name: string): Buffer {
  return loadFixtureFile(name, ".png");
}

/** Convenience: parse + render the first label in a ZPL fixture. */
export async function renderZpl(
  zpl: Uint8Array | string,
  options: DrawerOptions = {},
): Promise<Buffer> {
  const api = await loadRenderApi();
  if (!api) {
    throw new Error("zebrash render API not yet wired up (Parser/Drawer not exported)");
  }
  const parser = new api.Parser();
  const labels = await parser.parse(zpl);
  if (labels.length === 0) {
    throw new Error("no labels parsed from zpl input");
  }
  const first = labels[0];
  if (!first) {
    throw new Error("first label is undefined");
  }
  const drawer = new api.Drawer();
  const png = await drawer.drawLabelAsPng(first, options);
  return Buffer.isBuffer(png) ? png : Buffer.from(png);
}

// `Image` from @napi-rs/canvas is parameter-typed via the imported value's
// inference; we keep this helper local to share canvas setup between the two
// pixelDiff branches without leaking canvas types into the public surface.
function imageDataFor(
  img: Awaited<ReturnType<typeof loadImage>>,
  width: number,
  height: number,
): Uint8ClampedArray {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
}

export interface PixelDiffResult {
  /** Number of pixels whose RGB diverged beyond the threshold. */
  diffPixels: number;
  /** Total pixels compared (the smaller of the two intersected canvases). */
  totalPixels: number;
  /** diffPixels / totalPixels. */
  ratio: number;
  /** Width used for the comparison. */
  width: number;
  /** Height used for the comparison. */
  height: number;
}

/**
 * Pixel diff between two PNG buffers via @napi-rs/canvas. A pixel is counted
 * as different when any RGB channel differs by more than `threshold` (default
 * 16, covering FreeType/Skia anti-alias variation).
 */
export async function pixelDiff(
  a: Buffer | Uint8Array,
  b: Buffer | Uint8Array,
  threshold = 16,
): Promise<PixelDiffResult> {
  const [imgA, imgB] = await Promise.all([loadImage(Buffer.from(a)), loadImage(Buffer.from(b))]);
  const width = Math.min(imgA.width, imgB.width);
  const height = Math.min(imgA.height, imgB.height);

  const dataA = imageDataFor(imgA, width, height);
  const dataB = imageDataFor(imgB, width, height);

  let diffPixels = 0;
  for (let i = 0; i < dataA.length; i += 4) {
    const dr = Math.abs((dataA[i] ?? 0) - (dataB[i] ?? 0));
    const dg = Math.abs((dataA[i + 1] ?? 0) - (dataB[i + 1] ?? 0));
    const db = Math.abs((dataA[i + 2] ?? 0) - (dataB[i + 2] ?? 0));
    if (dr > threshold || dg > threshold || db > threshold) {
      diffPixels++;
    }
  }

  const totalPixels = width * height;
  return {
    diffPixels,
    totalPixels,
    ratio: totalPixels > 0 ? diffPixels / totalPixels : 0,
    width,
    height,
  };
}

export interface PngDimensions {
  width: number;
  height: number;
}

export async function pngDimensions(buffer: Buffer | Uint8Array): Promise<PngDimensions> {
  const img = await loadImage(Buffer.from(buffer));
  return { width: img.width, height: img.height };
}
