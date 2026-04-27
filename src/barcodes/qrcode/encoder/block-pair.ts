// Port of internal/barcodes/qrcode/encoder/block_pair.go

export class BlockPair {
  private dataBytes: Uint8Array;
  private errorCorrectionBytes: Uint8Array;

  constructor(data: Uint8Array, errorCorrection: Uint8Array) {
    this.dataBytes = data;
    this.errorCorrectionBytes = errorCorrection;
  }

  getDataBytes(): Uint8Array {
    return this.dataBytes;
  }

  getErrorCorrectionBytes(): Uint8Array {
    return this.errorCorrectionBytes;
  }
}
