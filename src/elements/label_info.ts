export interface LabelInfo {
  // Width of the label.
  PrintWidth: number;
  // Inverted mode, which mirrors label content across a horizontal axis.
  Inverted: boolean;
  // Label elements (barcodes, shapes, texts, etc.).
  Elements: unknown[];
}
