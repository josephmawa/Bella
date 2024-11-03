import GObject from "gi://GObject";
import GLib from "gi://GLib";

export const Color = GObject.registerClass(
  {
    GTypeName: "Color",
    Properties: {
      format: GObject.ParamSpec.string(
        "format",
        "Format",
        "Picked color format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      color: GObject.ParamSpec.string(
        "color",
        "Color",
        "Picked color",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      key: GObject.ParamSpec.string(
        "key",
        "Key",
        "Key used in the color object",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      color_variant_type: GObject.param_spec_variant(
        "color_variant_type",
        "colorVariantType",
        "Picked color in gVariantType datatype",
        GLib.VariantType.new("s"),
        null,
        GObject.ParamFlags.READWRITE
      ),
    },
  },
  class EvenNumbers extends GObject.Object {
    constructor(format, color, key) {
      super();
      this.format = format;
      this.color = color;
      this.key = key;
      this.color_variant_type = GLib.Variant.new_string(color);
    }
  }
);
