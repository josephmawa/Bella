import GObject from "gi://GObject";
import Gtk from "gi://Gtk";

export const CopyColorFormatButton = GObject.registerClass(
  {
    GTypeName: "CopyColorFormatButton",
    Template: getResourceUri("copy-color-button.ui"),
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
