import type { EncoderContext } from "./encoder_context.js";

export interface Encoder {
  getEncodingMode(): number;
  encode(context: EncoderContext): void;
}
