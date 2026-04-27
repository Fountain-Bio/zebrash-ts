import type { RecalledField, RecalledFieldData, StoredField } from "../elements/index.js";
import { type VirtualPrinter, getFieldInfo, resetFieldState } from "../printers/index.js";
import type { CommandParser } from "./command_parser.js";

export function newFieldSeparatorParser(): CommandParser {
  const code = "^FS";

  return {
    commandCode: code,
    parse: (_command: string, printer: VirtualPrinter) => {
      try {
        if (printer.nextElementFieldNumber < 0) {
          // No template field number → emit a recalled field that the renderer
          // can resolve immediately.
          // TODO(unit-1): once StoredField/RecalledField gain a real resolve()
          // method, return its result instead of the raw RecalledField.
          const stored: StoredField = {
            _kind: "StoredField",
            number: printer.nextElementFieldNumber,
            field: getFieldInfo(printer),
          };
          const recalled: RecalledField = {
            _kind: "RecalledField",
            storedField: stored,
            data: printer.nextElementFieldData,
          };
          return recalled;
        }

        if (printer.nextDownloadFormatName === "") {
          const data: RecalledFieldData = {
            _kind: "RecalledFieldData",
            number: printer.nextElementFieldNumber,
            data: printer.nextElementFieldData,
          };
          return data;
        }

        const stored: StoredField = {
          _kind: "StoredField",
          number: printer.nextElementFieldNumber,
          field: getFieldInfo(printer),
        };
        return stored;
      } finally {
        resetFieldState(printer);
      }
    },
  };
}
