import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import { settings } from "./utils/utils.js";
import { formats } from "./utils/color-formats.js";

export const BellaPreferencesDialog = GObject.registerClass(
  {
    GTypeName: "BellaPreferencesDialog",
    Template: getResourceUri("prefs.ui"),
    InternalChildren: ["color_format_settings", "precision_spin_row"],
    Properties: {
      color_format: GObject.ParamSpec.string(
        "color_format",
        "color-format",
        "Color format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
    },
  },
  class BellaPreferencesDialog extends Adw.PreferencesDialog {
    constructor(options = {}) {
      super(options);

      this.setColorFormatModel();
      settings.bind(
        "color-format",
        this,
        "color_format",
        Gio.SettingsBindFlags.DEFAULT
      );
      settings.bind(
        "precision",
        this._precision_spin_row.adjustment,
        "value",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.bind_property_full(
        "color_format",
        this._color_format_settings,
        "selected",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, colorFormat) => {
          const colorFormatObject = formats.find(
            ({ key }) => key === colorFormat
          );

          if (!colorFormatObject) {
            throw new Error(`${key} isn't in color formats`);
          }

          const model = this._color_format_settings.model;

          for (let i = 0; i < model.get_n_items(); i++) {
            const stringObject = model.get_item(i);

            if (stringObject?.string === colorFormatObject.description) {
              return [true, i];
            }
          }
          return [false, 0];
        },
        (_, selected) => {
          const stringObject =
            this._color_format_settings.model.get_item(selected);

          if (stringObject?.string) {
            const colorFormatObject = formats.find(
              ({ description }) => description === stringObject?.string
            );

            if (!colorFormatObject) {
              throw new Error("Selected option isn't in color formats");
            }
            return [true, colorFormatObject.key];
          }
          return [false, "rgb"];
        }
      );
    }

    setColorFormatModel = () => {
      const _colorFormats = formats.map(({ description }) => description);
      this._color_format_settings.model = Gtk.StringList.new(_colorFormats);

      const expression = Gtk.PropertyExpression.new(
        Gtk.StringObject,
        null,
        "string"
      );
      this._color_format_settings.expression = expression;
    };
  }
);
