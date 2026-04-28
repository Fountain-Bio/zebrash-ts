import type { CommandParser } from "./command_parser.js";

import {
  type RecalledField,
  type RecalledFieldData,
  type StoredField,
  resolveRecalledField,
} from "../elements/index.js";
import { type VirtualPrinter, getFieldInfo, resetFieldState } from "../printers/index.js";

export function newFieldSeparatorParser(): CommandParser {
  const code = "^FS";

  return {
    commandCode: code,
    parse: (_command: string, printer: VirtualPrinter) => {
      try {
        if (printer.nextElementFieldNumber < 0) {
          // No template field number → resolve the field immediately into its
          // concrete drawable element. Mirrors Go's `f.Resolve()` at
          // field_separator.go:26.
          const recalled: RecalledField = {
            _kind: "RecalledField",
            number: printer.nextElementFieldNumber,
            field: getFieldInfo(printer),
            data: printer.nextElementFieldData,
          };
          return resolveRecalledField(recalled);
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
