import GObject from "gi://GObject";
import Gtk from "gi://Gtk";

export const CopyColorFormatButton = GObject.registerClass(
  {
    GTypeName: "CopyColorFormatButton",
    Template: "resource:///io/github/josephmawa/Bella/copy-color-format-button.ui",
    Properties: {
      theme: GObject.ParamSpec.string(
        "colorFormat",
        "color_fomat",
        "Color format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class CopyColorFormatButton extends Gtk.Button {
    constructor() {
      super();
    }
  }
);
