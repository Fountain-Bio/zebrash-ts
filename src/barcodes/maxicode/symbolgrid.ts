// Port of github.com/ingridhq/maxicode/symbolgrid.go.
//
// The Go file's `Draw` method produced a hexagonal-cell rendering using the
// `gg` library; that is intentionally omitted here. Drawing of hexagons /
// bullseye is the maxicode drawer's responsibility (zebrash unit 23). This
// module only provides the bit grid (30 columns x 33 rows).

export const SYMBOL_GRID_WIDTH = 30;
export const SYMBOL_GRID_HEIGHT = 33;

export class SymbolGrid {
  readonly width = SYMBOL_GRID_WIDTH;
  readonly height = SYMBOL_GRID_HEIGHT;
  private readonly modules: Uint8Array = new Uint8Array(SYMBOL_GRID_WIDTH * SYMBOL_GRID_HEIGHT);

  setModule(row: number, column: number, value: boolean): void {
    this.modules[SYMBOL_GRID_WIDTH * row + column] = value ? 1 : 0;
  }

  getModule(row: number, column: number): boolean {
    return this.modules[SYMBOL_GRID_WIDTH * row + column] === 1;
  }

  /** Returns the grid as a `[height][width]` 2D boolean array. */
  getCells(): boolean[][] {
    const cells: boolean[][] = [];
    for (let row = 0; row < this.height; row++) {
      const r: boolean[] = new Array(this.width);
      for (let column = 0; column < this.width; column++) {
        r[column] = this.modules[SYMBOL_GRID_WIDTH * row + column] === 1;
      }
      cells.push(r);
    }
    return cells;
  }
}
