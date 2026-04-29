/**
 * Platform-abstracted operations that differ between Node and the browser.
 *
 * Everything else in the codebase uses the standard Web Canvas API
 * (CanvasRenderingContext2D, ImageData, …) which is implemented by both
 * `@napi-rs/canvas` (Node) and the browser natively. Only the bits that
 * cross the JS-engine boundary live here.
 */

/**
 * Minimal Canvas interface satisfied by both `@napi-rs/canvas`'s `Canvas` and
 * the browser's `OffscreenCanvas`. We only rely on the Web-Canvas-spec subset.
 */
export interface PlatformCanvas {
  readonly width: number;
  readonly height: number;
  getContext(type: "2d"): CanvasRenderingContext2D | null;
}

/**
 * Argument shape for `ctx.drawImage`. The browser uses `CanvasImageSource`;
 * `@napi-rs/canvas`'s `Image` type is structurally compatible.
 */
export type PlatformImageSource = CanvasImageSource;

export interface Platform {
  /** Create a new in-memory canvas of the given size. */
  createCanvas(width: number, height: number): PlatformCanvas;

  /**
   * Encode a canvas to PNG bytes. Async on both backends:
   *   - browser uses `canvas.convertToBlob()` (Promise)
   *   - @napi-rs/canvas uses `canvas.encode('png')` (Promise)
   */
  encodePng(canvas: PlatformCanvas): Promise<Uint8Array>;

  /** Decode a PNG/JPEG/etc. into a value usable as `ctx.drawImage`'s first arg. */
  loadImage(data: Uint8Array): Promise<PlatformImageSource>;

  /**
   * Register a TTF/OTF font under the given family name. Idempotent — calling
   * twice with the same family is a no-op.
   *
   * Async because the browser's `FontFace.load()` is Promise-based; on Node
   * `GlobalFonts.register` is synchronous, but we still return a Promise for
   * symmetry across platforms.
   */
  registerFont(data: Uint8Array, family: string): Promise<void>;

  /**
   * Construct an `ImageData`. The browser exposes `ImageData` as a global,
   * but Node ≤ 22 does not — `@napi-rs/canvas` exports its own constructor.
   */
  createImageData(data: Uint8ClampedArray, width: number, height: number): ImageData;
}
