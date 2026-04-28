import type { SKRSContext2D } from "@napi-rs/canvas";

import type { DrawerOptions } from "../drawer-options.ts";

import {
  FONT_FAMILY_DEJAVU_MONO,
  FONT_FAMILY_DEJAVU_MONO_BOLD,
  FONT_FAMILY_HELVETICA_BOLD,
  FONT_FAMILY_ZPL_GS,
  registerEmbeddedFonts,
} from "../assets/index.ts";
import {
  FieldAlignmentRight,
  FieldOrientation90,
  FieldOrientation180,
  FieldOrientation270,
  type FontInfo,
  LineColorBlack,
  type TextAlignment,
  TextAlignmentCenter,
  TextAlignmentJustified,
  TextAlignmentRight,
  type TextField,
} from "../elements/index.ts";
import {
  type DrawerState,
  type ElementDrawer,
  rotateAbout,
  scaleAbout,
  setLineColor,
} from "./index.ts";

/**
 * Draws a TextField (`^FD` after `^A`/`^FT`/`^FO` etc.) onto the canvas.
 * Mirrors `internal/drawers/text_field.go` in the Go reference.
 */
function isTextField(value: unknown): value is TextField {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { _kind?: unknown })._kind === "TextField"
  );
}

export function newTextFieldDrawer(): ElementDrawer {
  registerEmbeddedFonts();

  return {
    draw(ctx: SKRSContext2D, element: unknown, _options: DrawerOptions, state: DrawerState): void {
      if (!isTextField(element)) return;
      const text = adjustTextField(element);

      const scaleX = getFontScaleX(text.font);
      const family = getFontFamily(text.font);

      ctx.font = `${text.font.height}px "${family}"`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "left";
      setLineColor(ctx, LineColorBlack);

      const { width: rawW, fontHeight } = measure(ctx, text.text);
      const w = rawW * scaleX;
      const h = fontHeight;

      const [x, y] = getTextTopLeftPos(text, w, h, state);
      state.updateAutomaticTextPosition(text, w);

      const [ax, ay] = getTextAxAy(text);

      ctx.save();
      try {
        rotateAbout(ctx, text.font.orientation, x, y);
        if (scaleX !== 1.0) {
          scaleAbout(ctx, scaleX, 1, x, y);
        }

        if (text.block) {
          const maxWidth = text.block.maxWidth / scaleX;
          const lineSpacing = h === 0 ? 1 : 1 + text.block.lineSpacing / h;
          drawStringWrapped(
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
          );
        } else {
          drawStringAnchored(ctx, text.text, x, y, ax, ay);
        }
      } finally {
        ctx.restore();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function adjustTextField(text: TextField): TextField {
  // Font B is the bold ZPL font; its glyph table only has uppercase forms.
  if (text.font.name === "B") {
    return { ...text, text: text.text.toUpperCase() };
  }
  return text;
}

function getFontFamily(font: FontInfo): string {
  if (font.customFontFamily) {
    return font.customFontFamily;
  }
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
  // Empirical adjustment for the bitmap-emulated TTF fonts (matches Go).
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

function measure(ctx: SKRSContext2D, s: string): Measurement {
  const m = ctx.measureText(s);
  return {
    width: m.width,
    fontHeight: m.fontBoundingBoxAscent + m.fontBoundingBoxDescent,
  };
}

/**
 * Mirrors gg.Context.DrawStringAnchored: places the (ax, ay) anchor of the
 * text bounding box at (x, y), where (0, 0) puts the baseline at y.
 */
function drawStringAnchored(
  ctx: SKRSContext2D,
  s: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
): void {
  const { width, fontHeight } = measure(ctx, s);
  ctx.fillText(s, x - ax * width, y + ay * fontHeight);
}

/**
 * Mirrors gg's DrawStringWrapped, with justified-alignment support added
 * (matches Go zebrash's drawStringWrapped).
 */
function drawStringWrapped(
  ctx: SKRSContext2D,
  s: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  width: number,
  lineSpacing: number,
  align: TextAlignment,
  fontHeight: number,
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
      // Left or Justified
      lineAx = 0;
      break;
  }
  const lineAy = 1;

  const lastLine = lines.length - 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (align === TextAlignmentJustified && i < lastLine) {
      drawStringJustified(ctx, line, cx, cy, lineAx, lineAy, width, fontHeight);
    } else {
      drawStringAnchored(ctx, line, cx, cy, lineAx, lineAy);
    }
    cy += fontHeight * lineSpacing;
  }
}

function drawStringJustified(
  ctx: SKRSContext2D,
  line: string,
  x: number,
  y: number,
  ax: number,
  ay: number,
  maxWidth: number,
  fontHeight: number,
): void {
  const words = splitFields(line);
  if (words.length === 0) {
    return;
  }

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
    if (spaceWidth < 0) {
      spaceWidth = fontHeight * 0.3;
    }
  }

  let cx = x;
  for (let i = 0; i < words.length; i++) {
    drawStringAnchored(ctx, words[i] ?? "", cx, y, ax, ay);
    cx += (wordsWidth[i] ?? 0) + spaceWidth;
  }
}

/** Equivalent to Go's strings.Fields: whitespace-separated tokens. */
function splitFields(s: string): string[] {
  return s.split(/\s+/u).filter((w) => w.length > 0);
}

/**
 * Greedy word wrap that mirrors gg's wordWrap: paragraphs are split on
 * newlines first, then each paragraph is greedily packed by word so each
 * resulting line has measured width <= `width`.
 */
function wordWrap(ctx: SKRSContext2D, s: string, width: number): string[] {
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

// Exposed for unit testing the wrap algorithm in isolation.
export { wordWrap as _wordWrap };
