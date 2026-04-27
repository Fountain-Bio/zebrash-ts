export interface StoredGraphics {
  // The image data, in hexadecimal format. There is no default value.
  Data: Uint8Array;
  // The total number of bytes in the image (pixels / 8). No default.
  TotalBytes: number;
  // The number of bytes per pixel row in the image (pixel width / 8). Default 1 (rarely correct).
  RowBytes: number;
}
