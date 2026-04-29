import { BitList, GaloisField, ReedSolomonEncoder } from "../utils/index.js";

/** Pack `stuffedBits` into `wordCount` integer words of `wordSize` bits each. */
export function bitsToWords(stuffedBits: BitList, wordSize: number, wordCount: number): number[] {
  const message: number[] = Array.from({ length: wordCount }, () => 0);
  for (let i = 0; i < wordCount; i++) {
    let value = 0;
    for (let j = 0; j < wordSize; j++) {
      if (stuffedBits.getBit(i * wordSize + j)) {
        value |= 1 << (wordSize - j - 1);
      }
    }
    message[i] = value;
  }
  return message;
}

/**
 * Append Reed-Solomon ECC words to a stuffed message.
 * Returns the full message bits (data + ECC) for layout.
 */
export function generateCheckWords(bits: BitList, totalBits: number, wordSize: number): BitList {
  const rs = new ReedSolomonEncoder(getGF(wordSize));
  // bits is guaranteed to be a multiple of wordSize. `totalBits` is the
  // capacity of the symbol and may include a few leftover bits not divisible
  // by wordSize — those become the `startPad` zero prefix.
  const messageWordCount = Math.trunc(bits.len() / wordSize);
  const totalWordCount = Math.trunc(totalBits / wordSize);
  const eccWordCount = totalWordCount - messageWordCount;

  const messageWords = bitsToWords(bits, wordSize, messageWordCount);
  const eccWords = rs.encode(messageWords, eccWordCount);
  const startPad = totalBits % wordSize;

  const messageBits = new BitList();
  messageBits.addBits(0, startPad);
  for (const w of messageWords) {
    messageBits.addBits(w, wordSize);
  }
  for (const w of eccWords) {
    messageBits.addBits(w, wordSize);
  }
  return messageBits;
}

/** Galois field for the given word size, mirroring the Aztec spec. */
export function getGF(wordSize: number): GaloisField {
  switch (wordSize) {
    case 4:
      return new GaloisField(0x13, 16, 1);
    case 6:
      return new GaloisField(0x43, 64, 1);
    case 8:
      return new GaloisField(0x012d, 256, 1);
    case 10:
      return new GaloisField(0x409, 1024, 1);
    case 12:
      return new GaloisField(0x1069, 4096, 1);
    default:
      throw new Error(`unsupported aztec word size: ${wordSize}`);
  }
}
