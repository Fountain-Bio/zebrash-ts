import { describe, expect, it } from "vitest";
import { Parser, splitZplCommands } from "./parser.ts";

describe("splitZplCommands", () => {
  it("splits a real ZPL fragment", () => {
    const zpl = "^XA^FO50,50^FDhello^FS^XZ";
    const commands = splitZplCommands(zpl);
    expect(commands).toEqual(["", "^XA", "^FO50,50", "^FDhello", "^FS", "^XZ"]);
  });

  it("strips CR/LF/TAB whitespace before splitting", () => {
    const zpl = "^XA\r\n\t^FO10,10\n^FDhi^FS\r^XZ";
    expect(splitZplCommands(zpl)).toEqual(["", "^XA", "^FO10,10", "^FDhi", "^FS", "^XZ"]);
  });

  it("handles a single command without ^XA/^XZ wrappers", () => {
    expect(splitZplCommands("^FO0,0")).toEqual(["", "^FO0,0"]);
  });

  it("handles ^CC* changing the caret to *", () => {
    // After ^CC* the caret becomes '*'; subsequent commands use '*'.
    // The trailing splitter character itself is the second '*' that closes
    // the ^CC command — so we need ^CC**XA*XZ for clean delimitation.
    const zpl = "^CC**XA*XZ";
    const commands = splitZplCommands(zpl);
    // The ^CC* command itself is consumed (not pushed to results).
    // Commands starting with the new caret '*' are normalized back to '^'.
    expect(commands).toEqual(["", "^XA", "^XZ"]);
  });

  it("handles ~CT? changing the tilde to ?", () => {
    // After ~CT? the tilde becomes '?'. Use ?CC# afterwards to test that
    // the new tilde works for tilde-prefixed commands. We do something
    // simpler here: just verify a tilde-prefixed command after the change.
    const zpl = "~CT??HSfoo^XA^XZ";
    const commands = splitZplCommands(zpl);
    // Leading "" from the very first tilde, then the normalized ?HSfoo
    // (rewritten to ~HSfoo), then ^XA / ^XZ.
    expect(commands).toEqual(["", "~HSfoo", "^XA", "^XZ"]);
  });

  it("trims leading spaces from each command", () => {
    expect(splitZplCommands("^XA^FO   1,2^XZ")).toEqual(["", "^XA", "^FO   1,2", "^XZ"]);
    // Leading-space trimming targets the start of a *command*, after the
    // caret was pre-normalized. Construct a case where a leading space
    // would otherwise survive.
    expect(splitZplCommands("^XA  ^FO1,2^XZ")[2]).toBe("^FO1,2");
  });
});

describe("Parser.parse", () => {
  it("returns no labels for an empty input", () => {
    const parser = new Parser();
    expect(parser.parse("")).toEqual([]);
  });

  it("returns no labels for ^XA^XZ with no body elements", () => {
    const parser = new Parser();
    // Mirrors Go: when no elements accumulate between ^XA and ^XZ, no
    // LabelInfo is emitted.
    expect(parser.parse("^XA^XZ")).toEqual([]);
  });

  it("accepts both string and Uint8Array input", () => {
    const parser = new Parser();
    const bytes = new TextEncoder().encode("^XA^XZ");
    expect(parser.parse(bytes)).toEqual([]);
  });

  it("ignores commands when no command parsers are registered", () => {
    // With no parsers, even a real ZPL fragment yields no labels because
    // nothing accumulates resultElements.
    const parser = new Parser();
    expect(parser.parse("^XA^FO10,10^FDhello^FS^XZ")).toEqual([]);
  });

  it("invokes a registered parser and emits a LabelInfo on ^XZ", () => {
    type Echo = { kind: "Echo"; text: string };
    const echoParser = {
      commandCode: "^FD",
      parse(command: string): Echo | null {
        return { kind: "Echo", text: command.slice(3) };
      },
    };
    const parser = new Parser([echoParser]);
    const labels = parser.parse("^XA^FDhello^XZ");
    expect(labels).toHaveLength(1);
    expect(labels[0]?.elements).toEqual([{ kind: "Echo", text: "hello" }]);
    expect(labels[0]?.printWidth).toBe(0);
    expect(labels[0]?.inverted).toBe(false);
  });
});
