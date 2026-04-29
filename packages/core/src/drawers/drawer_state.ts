import { FieldOrientation, type TextFieldLike } from "../elements/index.ts";

/**
 * Tracks auto-positioning state for sequential text fields.
 *
 * Mirrors Go `internal/drawers.DrawerState`.
 */
export class DrawerState {
  autoPosX = 0;
  autoPosY = 0;

  /**
   * Advances the running auto-position cursor by `w` along the text's reading
   * direction. Only meaningful when the text uses bottom-anchored positioning.
   */
  updateAutomaticTextPosition(text: TextFieldLike, w: number): void {
    if (!text.position.calculateFromBottom) {
      return;
    }

    if (!text.position.automaticPosition) {
      this.autoPosX = text.position.x;
      this.autoPosY = text.position.y;
    }

    switch (text.font.orientation) {
      case FieldOrientation.Rotate90:
        this.autoPosY += w;
        break;
      case FieldOrientation.Rotate180:
        this.autoPosX -= w;
        break;
      case FieldOrientation.Rotate270:
        this.autoPosY -= w;
        break;
      default:
        this.autoPosX += w;
        break;
    }
  }

  /** Returns the effective `[x, y]` position for the given text field. */
  getTextPosition(text: TextFieldLike): [number, number] {
    if (text.position.automaticPosition) {
      return [this.autoPosX, this.autoPosY];
    }
    return [text.position.x, text.position.y];
  }
}
