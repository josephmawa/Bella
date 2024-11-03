import GObject from "gi://GObject";
import GLib from "gi://GLib";

export const SavedColor = GObject.registerClass(
  {
    GTypeName: "SavedColor",
    Properties: {
      id: GObject.param_spec_variant(
        "id",
        "ID",
        "Picked color ID gVariantType datatype",
        GLib.VariantType.new("s"),
        null,
        GObject.ParamFlags.READWRITE
      ),
      name: GObject.ParamSpec.string(
        "name",
        "Name",
        "Picked color name",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hex: GObject.ParamSpec.string(
        "hex",
        "Hex",
        "Picked color in hexadecimal format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      rgb: GObject.ParamSpec.string(
        "rgb",
        "Rgb",
        "Picked color in RGB format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      rgb_percent: GObject.ParamSpec.string(
        "rgb_percent",
        "RgbPercent",
        "Picked color in RGB percent format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hsl: GObject.ParamSpec.string(
        "hsl",
        "Hsl",
        "Picked color in HSL format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hsv: GObject.ParamSpec.string(
        "hsv",
        "Hsv",
        "Picked color in HSV format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      preferredColorFormat: GObject.ParamSpec.string(
        "preferredColorFormat",
        "preferred_color_format",
        "The preferred color format to be displayed in the Entry box",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      preferredColorFormatCopy: GObject.param_spec_variant(
        "preferredColorFormatCopy",
        "preferred_color_format_copy",
        "Preferred color format to be passed to the copy button action",
        GLib.VariantType.new("s"),
        null,
        GObject.ParamFlags.READWRITE
      ),
    },
  },
  class SavedColor extends GObject.Object {
    constructor(pickedColor = {}, preferredColorFormat) {
      super();

      const { id, name, hex, rgb, rgb_percent, hsl, hsv } = pickedColor;
      this.id = GLib.Variant.new_string(id);
      this.name = name;
      this.hex = hex;
      this.rgb = rgb;
      this.rgb_percent = rgb_percent;
      this.hsl = hsl;
      this.hsv = hsv;
      this.preferredColorFormat = pickedColor[preferredColorFormat];
      this.preferredColorFormatCopy = GLib.Variant.new_string(
        pickedColor[preferredColorFormat]
      );
    }
  }
);
