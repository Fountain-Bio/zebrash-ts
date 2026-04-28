import type { CommandParser } from "./command_parser.js";

import { newDownloadFormatParser } from "./download_format.js";
import { newDownloadGraphicsParser } from "./download_graphics.js";
import { newDownloadUnboundedTtfParser } from "./download_unbounded_ttf.js";
import { newGraphicBoxParser } from "./graphic_box.js";
import { newGraphicCircleParser } from "./graphic_circle.js";
import { newGraphicDiagonalLineParser } from "./graphic_diagonal_line.js";
import { newGraphicFieldParser } from "./graphic_field.js";
import { newGraphicSymbolParser } from "./graphic_symbol.js";
import { newImageLoadParser } from "./image_load.js";
import { newMaxicodeParser } from "./maxicode.js";
import { newRecallFormatParser } from "./recall_format.js";
import { newRecallGraphicsParser } from "./recall_graphics.js";

export const graphicAndFormatParsers: CommandParser[] = [
  newGraphicBoxParser(),
  newGraphicCircleParser(),
  newGraphicDiagonalLineParser(),
  newGraphicFieldParser(),
  newGraphicSymbolParser(),
  newImageLoadParser(),
  newDownloadFormatParser(),
  newDownloadGraphicsParser(),
  newDownloadUnboundedTtfParser(),
  newRecallFormatParser(),
  newRecallGraphicsParser(),
  newMaxicodeParser(),
];
