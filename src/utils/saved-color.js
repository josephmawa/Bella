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
      cmyk: GObject.ParamSpec.string(
        "cmyk",
        "Cmyk",
        "Picked color in CMYK format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hwb: GObject.ParamSpec.string(
        "hwb",
        "Hwb",
        "Picked color in HWB format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      xyz: GObject.ParamSpec.string(
        "xyz",
        "Xyz",
        "Picked color in XYZ format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hwb: GObject.ParamSpec.string(
        "lab",
        "Lab",
        "Picked color in LAB format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      hwb: GObject.ParamSpec.string(
        "lch",
        "Lch",
        "Picked color in LCH format",
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
      this.id = GLib.Variant.new_string(pickedColor.id);
      this.name = pickedColor.name;
      this.hex = pickedColor.hex;
      this.rgb = pickedColor.rgb;
      this.rgb_percent = pickedColor.rgb_percent;
      this.hsl = pickedColor.hsl;
      this.hsv = pickedColor.hsv;
      this.cmyk = pickedColor.cmyk;
      this.hwb = pickedColor.hwb;
      this.xyz = pickedColor.xyz;
      this.lab = pickedColor.lab;
      this.lch = pickedColor.lch;
      this.preferredColorFormat = pickedColor[preferredColorFormat];
      this.preferredColorFormatCopy = GLib.Variant.new_string(
        pickedColor[preferredColorFormat]
      );
    }
  }
);
