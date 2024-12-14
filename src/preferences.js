import Adw from "gi://Adw";
import GObject from "gi://GObject";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import { ConfirmDeleteAll } from "./confirm-delete-all.js";
import { colorFormats } from "./utils/color-formats.js";

export const BellaPreferencesDialog = GObject.registerClass(
  {
    GTypeName: "BellaPreferencesDialog",
    Template: "resource:///io/github/josephmawa/Bella/preferences.ui",
    InternalChildren: ["system", "dark", "light", "colorFormatSettings"],
    Properties: {
      theme: GObject.ParamSpec.string(
        "theme",
        "Theme",
        "Preferred theme",
        GObject.ParamFlags.READWRITE,
        ""
      ),
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

      this.settings = Gio.Settings.new("io.github.josephmawa.Bella");
      this.settings.bind(
        "preferred-theme",
        this,
        "theme",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.settings.bind(
        "color-format",
        this,
        "colorFormat",
        Gio.SettingsBindFlags.DEFAULT
      );

      this.bind_property_full(
        "theme",
        this._system,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "system"],
        (_, theme) => [theme, "system"]
      );

      this.bind_property_full(
        "theme",
        this._light,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "light"],
        (_, theme) => [theme, "light"]
      );

      this.bind_property_full(
        "theme",
        this._dark,
        "active",
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
        (_, theme) => [true, theme === "dark"],
        (_, theme) => [theme, "dark"]
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
                "There is a mismatch between color descriptions in the color format settings model and colorFormats array"
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
    };
  }
);
