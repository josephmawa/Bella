import Gtk from "gi://Gtk";
import GObject from "gi://GObject";

export const CopyColorButton = GObject.registerClass(
  {
    GTypeName: "CopyColorButton",
    Template: getResourceUri("copy-color-button.ui"),
  },
  class CopyColorButton extends Gtk.Button {
    constructor() {
      super();
    }
  }
);
