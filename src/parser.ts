// Port of zebrash/parser.go.

import { type LabelInfo, type RecalledFormat, isRecalledFormat } from "./elements/index.ts";
import type { CommandParser } from "./parsers/command_parser.ts";
import { canParse } from "./parsers/command_parser.ts";
import { defaultCommandParsers as defaultCommandParsersLazy } from "./parsers/index.ts";
import { type VirtualPrinter, newVirtualPrinter } from "./printers/index.ts";

const START_CODE = "^XA";
const END_CODE = "^XZ";

const CHANGE_TILDE_CODE = "CT";
const CHANGE_CARET_CODE = "CC";

const CARET = "^".charCodeAt(0);
const TILDE = "~".charCodeAt(0);

/**
 * Top-level ZPL parser. Mirrors Go's `zebrash.Parser`.
 *
 * The list of command parsers is supplied by the caller so that other units
 * can register their parsers without this file pulling in their dependencies.
 */
export class Parser {
  private readonly printer: VirtualPrinter;
  private readonly commandParsers: readonly CommandParser[];

  constructor(commandParsers?: readonly CommandParser[]) {
    this.printer = newVirtualPrinter();
    // Lazy import via module-level default to avoid a circular dependency
    // between parser.ts and parsers/index.ts.
    this.commandParsers = commandParsers ?? defaultCommandParsersLazy();
  }

  parse(zplData: Uint8Array | string): LabelInfo[] {
    const text = typeof zplData === "string" ? zplData : new TextDecoder("utf-8").decode(zplData);

    const commands = splitZplCommands(text);

    const results: LabelInfo[] = [];
    let resultElements: unknown[] = [];
    let currentRecalledFormat: RecalledFormat | null = null;

    for (const command of commands) {
      const upper = command.toUpperCase();

      if (upper.startsWith(START_CODE)) {
        this.printer.resetLabelState();
        currentRecalledFormat = null;
        continue;
      }

      if (upper.startsWith(END_CODE)) {
        if (currentRecalledFormat !== null) {
          resultElements.push(...currentRecalledFormat.resolveElements());
        }

        if (resultElements.length === 0) {
          continue;
        }

        if (this.printer.nextDownloadFormatName === "") {
          results.push({
            printWidth: this.printer.printWidth,
            inverted: this.printer.labelInverted,
            elements: resultElements,
          });
        } else {
          this.printer.storedFormats.set(this.printer.nextDownloadFormatName, {
            inverted: this.printer.labelInverted,
            elements: resultElements,
          });
        }

        resultElements = [];
        continue;
      }

      for (const cp of this.commandParsers) {
        if (!canParse(cp, command)) {
          continue;
        }

        const el = cp.parse(command, this.printer);
        if (el === null || el === undefined) {
          continue;
        }

        // Template swap: a recalled-format element starts a new template.
        if (isRecalledFormat(el)) {
          // Go appends `resolvedElements` (a []any slice) as a single
          // element here via `append(resultElements, resolvedElements)`,
          // not as a spread. Mirror that exactly.
          const resolved =
            currentRecalledFormat === null ? [] : currentRecalledFormat.resolveElements();
          resultElements.push(resolved);
          currentRecalledFormat = el;
          this.printer.labelInverted = el.inverted;
          continue;
        }

        // If a template is currently in use, route elements into it.
        if (currentRecalledFormat?.addElement(el)) {
          continue;
        }

        resultElements.push(el);
      }
    }

    return results;
  }
}

/**
 * Splits a raw ZPL byte sequence into normalized commands beginning with
 * `^` or `~`. Handles `^CCx` (caret change) and `~CTx` (tilde change)
 * commands, which retarget the caret/tilde delimiter for subsequent input.
 *
 * Mirrors Go's `splitZplCommands`.
 */
export function splitZplCommands(zplData: string): string[] {
  // Strip ASCII whitespace that ZPL ignores.
  const data = zplData.replace(/[\n\r\t]/g, "");

  let caret = CARET;
  let tilde = TILDE;

  let buff = "";
  const results: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const c = data.charCodeAt(i);

    let isCt = false;
    let isCc = false;
    if (buff.length === 4) {
      isCt = buff.indexOf(CHANGE_TILDE_CODE) === 1;
      isCc = buff.indexOf(CHANGE_CARET_CODE) === 1;
    }

    if (c === caret || c === tilde || isCt || isCc) {
      const normalized = normalizeCommand(buff, tilde, caret);
      buff = "";

      if (isCt) {
        // Index 3: the new tilde char (after `^CT`) when the buffer was 4 chars.
        tilde = normalized.charCodeAt(3);
      } else if (isCc) {
        caret = normalized.charCodeAt(3);
      } else {
        results.push(normalized);
      }
    }

    buff += data[i];
  }

  if (buff.length > 0) {
    results.push(normalizeCommand(buff, tilde, caret));
  }

  return results;
}

/**
 * If the command starts with the active (non-default) caret/tilde, rewrite
 * it to use the canonical `^` / `~` so downstream parsers can match prefixes
 * uniformly. Also trims leading spaces.
 */
function normalizeCommand(command: string, tilde: number, caret: number): string {
  let result = command;
  if (caret !== CARET && result.length > 0 && result.charCodeAt(0) === caret) {
    result = `^${result.slice(1)}`;
  }
  if (tilde !== TILDE && result.length > 0 && result.charCodeAt(0) === tilde) {
    result = `~${result.slice(1)}`;
  }
  return result.replace(/^ +/, "");
}
