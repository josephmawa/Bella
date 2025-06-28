import Adw from "gi://Adw";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GObject from "gi://GObject";
import { ConfirmDeleteAll } from "./delete-all.js";
import { colorFormats } from "./utils/color-formats.js";
import { settings } from "./utils/utils.js";

export const BellaPreferencesDialog = GObject.registerClass(
  {
    GTypeName: "BellaPreferencesDialog",
    Template: getResourceUri("prefs.ui"),
    InternalChildren: ["colorFormatSettings"],
    Properties: {
      colorFormat: GObject.ParamSpec.string(
        "colorFormat",
        "color_format",
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
        "colorFormat",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.bind_property_full(
        "colorFormat",
        this._colorFormatSettings,
        "selected",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, colorFormat) => {
          const colorFormatObject = colorFormats.find(
            ({ key }) => key === colorFormat
          );

          if (!colorFormatObject) {
            throw new Error(
              "Mismatch between color keys in the settings and in colorFormats array"
            );
          }

          const model = this._colorFormatSettings.model;

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
            this._colorFormatSettings.model.get_item(selected);

          if (stringObject?.string) {
            const colorFormatObject = colorFormats.find(
              ({ description }) => description === stringObject?.string
            );

            if (!colorFormatObject) {
              throw new Error(
                "Mismatch between color format settings and colorFormats array"
              );
            }
            return [true, colorFormatObject.key];
          }
          return [false, "rgb"];
        }
      );
    }

    deleteSavedColors() {
      const confirmDeleteAll = new ConfirmDeleteAll();
      confirmDeleteAll.present(this);
    }

    setColorFormatModel = () => {
      const _colorFormats = colorFormats.map(({ description }) => description);
      this._colorFormatSettings.model = Gtk.StringList.new(_colorFormats);

      const expression = Gtk.PropertyExpression.new(
        Gtk.StringObject,
        null,
        "string"
      );

      this._colorFormatSettings.expression = expression;
    };
  }
);
