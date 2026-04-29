import type { FontKey } from "../assets/fonts.ts";

/**
 * SVG-side analog of `CanvasRenderingContext2D` used by the per-element SVG
 * drawers. Pure string assembly — no platform dependency, identical
 * behaviour on Node and browser.
 *
 * The transform model mirrors canvas: `save` snapshots the current state and
 * `restore` rolls back to it. `translate`/`rotate`/`scale` and `pushGroup`
 * each emit a `<g>` open whose matching close is deferred until the next
 * `restore` (or `popGroup`). This lets the SVG drawers stay near
 * line-for-line ports of their canvas siblings.
 */
export class SvgEmitter {
  private body = "";
  private defs = "";
  private readonly definedSymbols = new Set<string>();
  private readonly saveStack: number[] = [];
  private openGroups = 0;
  private readonly fonts = new Set<FontKey>();

  save(): void {
    this.saveStack.push(this.openGroups);
  }

  restore(): void {
    const target = this.saveStack.pop() ?? 0;
    while (this.openGroups > target) {
      this.body += "</g>";
      this.openGroups -= 1;
    }
  }

  translate(tx: number, ty: number): void {
    if (tx === 0 && ty === 0) return;
    this.body += `<g transform="translate(${n(tx)} ${n(ty)})">`;
    this.openGroups += 1;
  }

  rotate(radians: number): void {
    if (radians === 0) return;
    const degrees = (radians * 180) / Math.PI;
    this.body += `<g transform="rotate(${n(degrees)})">`;
    this.openGroups += 1;
  }

  scale(sx: number, sy: number): void {
    if (sx === 1 && sy === 1) return;
    this.body += `<g transform="scale(${n(sx)} ${n(sy)})">`;
    this.openGroups += 1;
  }

  /** Open a group with arbitrary attributes (style, mask, etc.). */
  pushGroup(attrs: string): void {
    this.body += attrs.length > 0 ? `<g ${attrs}>` : "<g>";
    this.openGroups += 1;
  }

  popGroup(): void {
    if (this.openGroups === 0) return;
    this.body += "</g>";
    this.openGroups -= 1;
  }

  rect(x: number, y: number, width: number, height: number, fill: string): void {
    if (width <= 0 || height <= 0) return;
    this.body += `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" fill="${fill}"/>`;
  }

  /**
   * Stroked rectangle outline. Width and height are the outer extents; the
   * stroke is centred on the path so the caller is responsible for any
   * inset that mirrors the canvas drawer's `border / 2` adjustment.
   */
  rectStroke(
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: string,
    strokeWidth: number,
  ): void {
    this.body += `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" fill="none" stroke="${stroke}" stroke-width="${n(strokeWidth)}"/>`;
  }

  /**
   * Two-rect "donut" emitted as a single `<path>` with `fill-rule: evenodd`.
   * Mirrors the canvas drawer's rounded-rect-with-inner-cutout pattern used
   * by `^GB` (graphic box) when `cornerRounding > 0`.
   */
  roundedDonut(
    x: number,
    y: number,
    w: number,
    h: number,
    rOuter: number,
    innerX: number,
    innerY: number,
    innerW: number,
    innerH: number,
    rInner: number,
    fill: string,
  ): void {
    const outer = roundedRectPath(x, y, w, h, rOuter);
    if (innerW <= 0 || innerH <= 0 || rInner <= 0) {
      this.body += `<path d="${outer}" fill="${fill}"/>`;
      return;
    }
    const inner = roundedRectPath(innerX, innerY, innerW, innerH, rInner);
    this.body += `<path d="${outer} ${inner}" fill="${fill}" fill-rule="evenodd"/>`;
  }

  roundedRect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fill: string,
  ): void {
    this.body += `<path d="${roundedRectPath(x, y, w, h, r)}" fill="${fill}"/>`;
  }

  polygon(points: ReadonlyArray<readonly [number, number]>, fill: string): void {
    if (points.length === 0) return;
    const pts = points.map(([x, y]) => `${n(x)},${n(y)}`).join(" ");
    this.body += `<polygon points="${pts}" fill="${fill}"/>`;
  }

  circleStroke(
    cx: number,
    cy: number,
    r: number,
    stroke: string,
    strokeWidth: number,
  ): void {
    this.body += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="none" stroke="${stroke}" stroke-width="${n(strokeWidth)}"/>`;
  }

  /** Reuse a previously-defined `<symbol id>` at (x, y). Used by maxicode. */
  use(id: string, x: number, y: number): void {
    this.body += `<use href="#${id}" x="${n(x)}" y="${n(y)}"/>`;
  }

  /**
   * Define a `<symbol>` once, by id, in the SVG `<defs>`. No-ops on repeat
   * calls with the same id, so callers can lazily ensure a symbol exists.
   */
  defineSymbol(id: string, fragment: string): void {
    if (this.definedSymbols.has(id)) return;
    this.definedSymbols.add(id);
    this.defs += `<symbol id="${id}" overflow="visible">${fragment}</symbol>`;
  }

  /**
   * Define a raw `<defs>` fragment once, by id. The `<defs>` body is kept
   * unique by tracking ids in `definedSymbols` (despite the name —
   * tracking-set is shared so any defs id is global to the document).
   */
  defineFragment(id: string, fragment: string): void {
    if (this.definedSymbols.has(id)) return;
    this.definedSymbols.add(id);
    this.defs += fragment;
  }

  text(
    x: number,
    y: number,
    str: string,
    opts: {
      fontFamily: string;
      fontSize: number;
      fontKey?: FontKey | undefined;
      anchor?: "start" | "middle" | "end";
      baseline?: "alphabetic" | "hanging" | "middle" | "text-top";
      fill?: string;
    },
  ): void {
    if (opts.fontKey !== undefined) this.fonts.add(opts.fontKey);
    const anchor = opts.anchor ?? "start";
    const fill = opts.fill ?? "#000000";
    const baseline = opts.baseline ?? "alphabetic";
    // SVG `dominant-baseline: alphabetic` is the canvas default; emit only
    // when overridden so the attribute set stays terse.
    const baselineAttr =
      baseline === "alphabetic" ? "" : ` dominant-baseline="${baseline}"`;
    this.body += `<text x="${n(x)}" y="${n(y)}" font-family="${escapeAttr(opts.fontFamily)}" font-size="${n(opts.fontSize)}" fill="${fill}" text-anchor="${anchor}"${baselineAttr}>${escapeText(str)}</text>`;
  }

  image(href: string, x: number, y: number, width: number, height: number): void {
    if (width <= 0 || height <= 0) return;
    // `image-rendering: pixelated` keeps `^GF` bitmaps crisp when the SVG
    // is scaled up — matches the nearest-neighbor look of the PNG path.
    this.body += `<image href="${escapeAttr(href)}" x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" preserveAspectRatio="none" style="image-rendering:pixelated"/>`;
  }

  /** Set of `FontKey`s referenced by `text` calls so far. */
  get usedFonts(): ReadonlySet<FontKey> {
    return this.fonts;
  }

  /**
   * Wrap the accumulated body in an `<svg>` root and return the document.
   * `extraDefs` is interpolated inside `<defs>` (use it for `@font-face`).
   * The internal `<symbol>` defs collected via `defineSymbol` are emitted
   * unconditionally.
   */
  toSvg(width: number, height: number, extraDefs: string): string {
    // Close any groups the caller forgot to balance — defensive, mirrors
    // canvas's tolerance for unbalanced save/restore.
    while (this.openGroups > 0) {
      this.body += "</g>";
      this.openGroups -= 1;
    }
    const defsBody = `${extraDefs}${this.defs}`;
    const defsBlock = defsBody.length > 0 ? `<defs>${defsBody}</defs>` : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}" height="${n(height)}" viewBox="0 0 ${n(width)} ${n(height)}">` +
      defsBlock +
      this.body +
      "</svg>"
    );
  }
}

/**
 * Format a number for SVG attribute output. Trims trailing zeros and emits
 * integers without a decimal point. 3 decimal places balances precision
 * (≤ 1/1000 of a pixel) against output size.
 */
function n(v: number): string {
  if (Number.isInteger(v)) return v.toString();
  const s = v.toFixed(3);
  // Trim trailing zeros and a dangling decimal point.
  return s.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function escapeText(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  // Clamp r to half the smaller side, matching SVG's <rect rx ry> behaviour
  // and the canvas drawer's intent.
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  if (radius === 0) {
    return `M${n(x)} ${n(y)} h${n(w)} v${n(h)} h${n(-w)} Z`;
  }
  const x2 = x + w;
  const y2 = y + h;
  return (
    `M${n(x + radius)} ${n(y)} ` +
    `H${n(x2 - radius)} ` +
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x2)} ${n(y + radius)} ` +
    `V${n(y2 - radius)} ` +
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x2 - radius)} ${n(y2)} ` +
    `H${n(x + radius)} ` +
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x)} ${n(y2 - radius)} ` +
    `V${n(y + radius)} ` +
    `A${n(radius)} ${n(radius)} 0 0 1 ${n(x + radius)} ${n(y)} Z`
  );
}
