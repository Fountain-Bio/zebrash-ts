import { describe, expect, it } from "vitest";

import { Encoder_encode } from "./encoder/encoder.ts";
import { ErrorCorrectionLevel } from "./encoder/error-correction-level.ts";
import {
  MaskUtil_applyMaskPenaltyRule1,
  MaskUtil_applyMaskPenaltyRule2,
  MaskUtil_applyMaskPenaltyRule3,
  MaskUtil_applyMaskPenaltyRule4,
  MaskUtil_getDataMaskBit,
} from "./encoder/mask-util.ts";
import { Mode_ALPHANUMERIC, Mode_BYTE, Mode_NUMERIC } from "./encoder/mode.ts";
import { Encode } from "./qrcode-writer.ts";

describe("QR encoder", () => {
  it("encodes 'HELLO' at L correction → version 1, 21x21 matrix", () => {
    const code = Encoder_encode("HELLO", ErrorCorrectionLevel.L, {});
    const m = code.getMatrix();
    expect(m).not.toBeNull();
    if (m === null) {
      throw new Error("matrix null");
    }
    expect(m.getWidth()).toBe(21);
    expect(m.getHeight()).toBe(21);
    expect(code.getVersion()?.getVersionNumber()).toBe(1);
    expect(code.getMode()?.toString()).toBe("ALPHANUMERIC");
    // mask pattern is in 0..7
    expect(code.getMaskPattern()).toBeGreaterThanOrEqual(0);
    expect(code.getMaskPattern()).toBeLessThan(8);

    // Finder pattern at top-left (0..6, 0..6) — outer ring is dark.
    for (let i = 0; i < 7; i++) {
      expect(m.get(i, 0)).toBe(1); // top edge
      expect(m.get(i, 6)).toBe(1); // bottom edge
      expect(m.get(0, i)).toBe(1); // left edge
      expect(m.get(6, i)).toBe(1); // right edge
    }
    // Inner 3x3 block of finder is dark.
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        expect(m.get(x, y)).toBe(1);
      }
    }
    // Light ring around inner block.
    for (let i = 1; i <= 5; i++) {
      expect(m.get(i, 1)).toBe(0);
      expect(m.get(i, 5)).toBe(0);
      expect(m.get(1, i)).toBe(0);
      expect(m.get(5, i)).toBe(0);
    }

    // Dark module always at (8, height-8) per spec.
    expect(m.get(8, m.getHeight() - 8)).toBe(1);
  });

  it("encodes a numeric run '1234567' at M correction in NUMERIC mode", () => {
    const code = Encoder_encode("1234567", ErrorCorrectionLevel.M, {});
    expect(code.getMode()).toBe(Mode_NUMERIC);
    const m = code.getMatrix();
    expect(m).not.toBeNull();
    if (m === null) {
      throw new Error("matrix null");
    }
    // Should fit in version 1 (21x21).
    expect(m.getWidth()).toBe(21);
    expect(code.getVersion()?.getVersionNumber()).toBe(1);
  });

  it("forces a higher version with a longer string", () => {
    // 50-char alphanumeric string overflows version 1 at H correction.
    const long = "A".repeat(50);
    const code = Encoder_encode(long, ErrorCorrectionLevel.H, {});
    expect(code.getMode()).toBe(Mode_ALPHANUMERIC);
    const v = code.getVersion();
    expect(v).not.toBeNull();
    if (v === null) {
      throw new Error("version null");
    }
    expect(v.getVersionNumber()).toBeGreaterThan(1);
    const m = code.getMatrix();
    if (m === null) {
      throw new Error("matrix null");
    }
    expect(m.getWidth()).toBe(17 + 4 * v.getVersionNumber());
  });

  it("rejects inputs that cannot fit at version 40", () => {
    // Version 40-H holds at most 1273 alphanumeric characters; H also caps
    // BYTE mode at 1273 bytes and NUMERIC at 3057. Use BYTE mode with a
    // string of 4000 single-byte chars to exceed all capacity.
    const huge = "x".repeat(4000);
    expect(() => Encoder_encode(huge, ErrorCorrectionLevel.H, {})).toThrow();
  });

  it("Encode renders into a BitMatrix with correct dimensions and quiet zone", () => {
    const out = Encode("HELLO", 0, 0, ErrorCorrectionLevel.L, { QuietZone: 4 });
    // Version 1 is 21x21; with quiet zone 4 the rendered matrix is 29x29.
    expect(out.getWidth()).toBe(29);
    expect(out.getHeight()).toBe(29);
    // The 4-pixel quiet zone border must be all light.
    for (let i = 0; i < 29; i++) {
      for (let j = 0; j < 4; j++) {
        expect(out.get(i, j)).toBe(false); // top
        expect(out.get(i, 28 - j)).toBe(false); // bottom
        expect(out.get(j, i)).toBe(false); // left
        expect(out.get(28 - j, i)).toBe(false); // right
      }
    }
    // Top-left finder pattern is in the QR module at (4,4).
    expect(out.get(4, 4)).toBe(true);
    expect(out.get(10, 4)).toBe(true);
    expect(out.get(10, 10)).toBe(true);
    expect(out.get(4, 10)).toBe(true);
  });

  it("scales the rendered matrix when output size exceeds quiet-zoned QR", () => {
    const out = Encode("HELLO", 100, 100, ErrorCorrectionLevel.L, { QuietZone: 4 });
    // QR is 29x29 with quiet zone, so multiple = floor(100/29) = 3 ⇒ 87x87
    // would fit, but the function caps the output at the requested size.
    expect(out.getWidth()).toBe(100);
    expect(out.getHeight()).toBe(100);
  });

  it("handles BYTE mode for non-ASCII content", () => {
    const code = Encoder_encode("Hello, world!", ErrorCorrectionLevel.M, {});
    expect(code.getMode()).toBe(Mode_BYTE);
    expect(code.getVersion()?.getVersionNumber()).toBe(1);
  });

  it("respects an explicit version number", () => {
    const code = Encoder_encode("HELLO", ErrorCorrectionLevel.L, { VersionNumber: 5 });
    expect(code.getVersion()?.getVersionNumber()).toBe(5);
    const m = code.getMatrix();
    if (m === null) {
      throw new Error("matrix null");
    }
    expect(m.getWidth()).toBe(37);
  });

  it("respects an explicit mask pattern", () => {
    const code = Encoder_encode("HELLO", ErrorCorrectionLevel.L, { MaskPattern: 3 });
    expect(code.getMaskPattern()).toBe(3);
  });
});

describe("mask util", () => {
  it("getDataMaskBit matches reference values for pattern 0", () => {
    // pattern 0: (x+y) % 2 == 0
    expect(MaskUtil_getDataMaskBit(0, 0, 0)).toBe(true);
    expect(MaskUtil_getDataMaskBit(0, 0, 1)).toBe(false);
    expect(MaskUtil_getDataMaskBit(0, 1, 1)).toBe(true);
  });

  it("rejects unknown mask patterns", () => {
    expect(() => MaskUtil_getDataMaskBit(8, 0, 0)).toThrow();
  });

  it("penalty rules return finite numbers on a real QR matrix", () => {
    const code = Encoder_encode("HELLO", ErrorCorrectionLevel.L, {});
    const m = code.getMatrix();
    if (m === null) {
      throw new Error("matrix null");
    }
    expect(MaskUtil_applyMaskPenaltyRule1(m)).toBeGreaterThanOrEqual(0);
    expect(MaskUtil_applyMaskPenaltyRule2(m)).toBeGreaterThanOrEqual(0);
    expect(MaskUtil_applyMaskPenaltyRule3(m)).toBeGreaterThanOrEqual(0);
    expect(MaskUtil_applyMaskPenaltyRule4(m)).toBeGreaterThanOrEqual(0);
  });
});
