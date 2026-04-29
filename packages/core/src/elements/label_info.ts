export interface LabelInfo {
  // Width of the label.
  printWidth: number;
  // Inverted mode, which mirrors label content across a horizontal axis.
  inverted: boolean;
  // Label elements (barcodes, shapes, texts, etc.).
  elements: unknown[];
}
