// SVG analogue of `drawers/text_field.ts`. This is the most complex drawer
// — orientation, font scaling, word-wrap, anchor positioning all matter.
//
// Approach: measure on an offscreen canvas (so we get the same widths as the
// PNG path, and word-wrap lands on identical line breaks), but emit `<text>`
// elements for the actual rendering. Pre-anchor the x/y so we always emit
// with `text-anchor="start"` — that sidesteps any rasteriser-specific
// interpretation of SVG's anchor / dominant-baseline interactions.

import {
  type FontKey,
  FONT_FAMILY_DEJAVU_MONO,
  FONT_FAMILY_DEJAVU_MONO_BOLD,
  FONT_FAMILY_HELVETICA_BOLD,
  FONT_FAMILY_ZPL_GS,
  registerEmbeddedFonts,
} from "../assets/index.ts";
import type { DrawerOptions } from "../drawer-options.ts";
import type { DrawerState } from "../drawers/drawer_state.ts";
import {
  FieldAlignmentRight,
  FieldOrientation90,
  FieldOrientation180,
  FieldOrientation270,
  type FontInfo,
  type TextAlignment,
  TextAlignmentCenter,
  TextAlignmentJustified,
  TextAlignmentRight,
  type TextField,
} from "../elements/index.ts";
import { platform } from "../platform.ts";
import type { SvgEmitter } from "../svg/emitter.ts";
import type { SvgElementDrawer } from "./svg_element_drawer.ts";
import { rotateAbout, scaleAbout } from "./transform.ts";

const FONT_KEY_BY_FAMILY: Record<string, FontKey> = {
  [FONT_FAMILY_HELVETICA_BOLD]: "HelveticaBold",
  [FONT_FAMILY_DEJAVU_MONO]: "DejavuSansMono",
  [FONT_FAMILY_DEJAVU_MONO_BOLD]: "DejavuSansMonoBold",
  [FONT_FAMILY_ZPL_GS]: "ZplGS",
};

function isTextField(value: unknown): value is TextField {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "TextField"
  );
}

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (measureCtx === null) {
    const canvas = platform.createCanvas(1, 1);
    const ctx = canvas.getContext("2d");
    if (ctx === null) {
      throw new Error("zebrash: failed to acquire 2D context for SVG text measurement");
    }
    measureCtx = ctx;
  }
  return measureCtx;
}

export function newTextFieldSvgDrawer(): SvgElementDrawer {
  return {
    async draw(
      emitter: SvgEmitter,
      element: unknown,
      _options: DrawerOptions,
      state: DrawerState,
    ): Promise<void> {
      if (!isTextField(element)) return;
      // Same lazy font setup as the canvas drawer — needed because the
      // measurement canvas (offscreen, but real) still uses the platform's
      // font registry.
      await registerEmbeddedFonts();
      if (element.font.customFont && !element.font.customFontFamily) {
        await platform.registerFont(element.font.customFont.data, element.font.customFont.name);
        element.font.customFontFamily = element.font.customFont.name;
      }
      const text = adjustTextField(element);

      const scaleX = getFontScaleX(text.font);
      const family = getFontFamily(text.font);
      const fontKey = FONT_KEY_BY_FAMILY[family];

      const ctx = getMeasureCtx();
      ctx.font = `${text.font.height}px "${family}"`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";

      const { width: rawW, fontHeight } = measure(ctx, text.text);
      const w = rawW * scaleX;
      const h = fontHeight;

      const [x, y] = getTextTopLeftPos(text, w, h, state);
      state.updateAutomaticTextPosition(text, w);

      const [ax, ay] = getTextAxAy(text);

      emitter.save();
      try {
        rotateAbout(emitter, text.font.orientation, x, y);
        if (scaleX !== 1.0) {
          scaleAbout(emitter, scaleX, 1, x, y);
        }

        if (text.block) {
          const maxWidth = text.block.maxWidth / scaleX;
          const lineSpacing = h === 0 ? 1 : 1 + text.block.lineSpacing / h;
          drawStringWrapped(
            emitter,
            ctx,
            text.text,
            x,
            y - h,
            ax,
            ay,
            maxWidth,
            lineSpacing,
            text.block.alignment,
            h,
            family,
            fontKey,
            text.font.height,
          );
        } else {
          drawStringAnchored(
            emitter,
            ctx,
            text.text,
            x,
            y,
            ax,
            ay,
            family,
            fontKey,
            text.font.height,
          );
        }
      } finally {
        emitter.restore();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers — same shape as the canvas drawer, but rendering through the emitter.
// ---------------------------------------------------------------------------

function adjustTextField(text: TextField): TextField {
  if (text.font.name === "B") {
    return { ...text, text: text.text.toUpperCase() };
  }
  return text;
}

function getFontFamily(font: FontInfo): string {
  if (font.customFontFamily) return font.customFontFamily;
  switch (font.name) {
    case "0":
      return FONT_FAMILY_HELVETICA_BOLD;
    case "B":
      return FONT_FAMILY_DEJAVU_MONO_BOLD;
    case "GS":
      return FONT_FAMILY_ZPL_GS;
    default:
      return FONT_FAMILY_DEJAVU_MONO;
  }
}

function getFontScaleX(font: FontInfo): number {
  if (font.height !== 0) {
    return (widthToHeightRatio(font) * font.width) / font.height;
  }
  return 1.0;
}

function widthToHeightRatio(font: FontInfo): number {
  if (font.name === "0" || font.name === "GS" || font.customFontFamily) {
    return 1.0;
  }
  return 2.0;
}

function getTextTopLeftPos(
  text: TextField,
  w: number,
  h: number,
  state: DrawerState,
): [number, number] {
  const [x, y] = state.getTextPosition(text);

  let lines = 1;
  let spacing = 0;
  let blockW = w;

  if (text.block) {
    lines = Math.max(text.block.maxLines, 1);
    spacing = text.block.lineSpacing;
    blockW = text.block.maxWidth;
  }

  if (!text.position.calculateFromBottom) {
    switch (text.font.orientation) {
      case FieldOrientation90:
        return [x + h / 4, y];
      case FieldOrientation180:
        return [x + blockW, y + h / 4];
      case FieldOrientation270:
        return [x + (3 * h) / 4, y + blockW];
      default:
        return [x, y + (3 * h) / 4];
    }
  }

  const offset = (lines - 1) * (h + spacing);

  switch (text.font.orientation) {
    case FieldOrientation90:
      return [x + offset, y];
    case FieldOrientation180:
      return [x, y + offset];
    case FieldOrientation270:
      return [x - offset, y];
    default:
      return [x, y - offset];
  }
}

function getTextAxAy(text: TextField): [number, number] {
  return [text.alignment === FieldAlignmentRight ? 1 : 0, 0];
}

interface Measurement {
  width: number;
  fontHeight: number;
}

function measure(ctx: CanvasRenderingContext2D, s: string): Measurement {
  const m = ctx.measureText(s);
  return {
    width: m.width,
    fontHeight: m.fontBoundingBoxAscent + m.fontBoundingBoxDescent,
  };
}

/**
 * Mirrors the canvas drawer's `drawStringAnchored`. We pre-compute the
 * effective x/y (same arithmetic the canvas applies via fillText offsets)
 * and emit a single `<text>` with `text-anchor="start"`.
 */
function drawStringAnchored(
  emitter: SvgEmitter,
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  family: string,
  fontKey: FontKey | undefined,
  fontSize: number,
): void {
  const { width, fontHeight } = measure(ctx, s);
  emitter.text(x - ax * width, y + ay * fontHeight, s, {
    fontFamily: family,
    fontKey,
    fontSize,
    anchor: "start",
  });
}

/**
 * Mirrors the canvas drawer's `drawStringWrapped` + `drawStringJustified`.
 */
function drawStringWrapped(
  emitter: SvgEmitter,
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  width: number,
  lineSpacing: number,
  align: TextAlignment,
  fontHeight: number,
  family: string,
  fontKey: FontKey | undefined,
  fontSize: number,
): void {
  const lines = wordWrap(ctx, s, width);

  let totalH = lines.length * fontHeight * lineSpacing;
  totalH -= (lineSpacing - 1) * fontHeight;

  let cx = x - ax * width;
  let cy = y - ay * totalH;

  let lineAx = ax;
  switch (align) {
    case TextAlignmentCenter:
      lineAx = 0.5;
      cx += width / 2;
      break;
    case TextAlignmentRight:
      lineAx = 1;
      cx += width;
      break;
    default:
      lineAx = 0;
      break;
  }
  const lineAy = 1;

  const lastLine = lines.length - 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (align === TextAlignmentJustified && i < lastLine) {
      drawStringJustified(emitter, ctx, line, cx, cy, lineAx, lineAy, width, fontHeight, family, fontKey, fontSize);
    } else {
      drawStringAnchored(emitter, ctx, line, cx, cy, lineAx, lineAy, family, fontKey, fontSize);
    }
    cy += fontHeight * lineSpacing;
  }
}

function drawStringJustified(
  emitter: SvgEmitter,
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  maxWidth: number,
  fontHeight: number,
  family: string,
  fontKey: FontKey | undefined,
  fontSize: number,
): void {
  const words = splitFields(line);
  if (words.length === 0) return;

  const wordsWidth: number[] = Array.from({ length: words.length }, () => 0);
  let totalWordWidth = 0;
  for (let i = 0; i < words.length; i++) {
    const w = ctx.measureText(words[i] ?? "").width;
    wordsWidth[i] = w;
    totalWordWidth += w;
  }

  const spaceCount = words.length - 1;
  let spaceWidth = 0;
  if (spaceCount > 0) {
    spaceWidth = (maxWidth - totalWordWidth) / spaceCount;
    if (spaceWidth < 0) spaceWidth = fontHeight * 0.3;
  }

  let cx = x;
  for (let i = 0; i < words.length; i++) {
    drawStringAnchored(emitter, ctx, words[i] ?? "", cx, y, ax, ay, family, fontKey, fontSize);
    cx += (wordsWidth[i] ?? 0) + spaceWidth;
  }
}

function splitFields(s: string): string[] {
  return s.split(/\s+/u).filter((w) => w.length > 0);
}

function wordWrap(ctx: CanvasRenderingContext2D, s: string, width: number): string[] {
  const result: string[] = [];
  for (const paragraph of s.split("\n")) {
    const words = splitFields(paragraph);
    if (words.length === 0) {
      result.push("");
      continue;
    }
    let current = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const word = words[i] ?? "";
      const candidate = `${current} ${word}`;
      if (ctx.measureText(candidate).width > width) {
        result.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    result.push(current);
  }
  return result;
}
