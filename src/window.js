import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Xdp from "gi://Xdp";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import { savedColorsFile } from "./app.js";
import { ConfirmDeleteOne } from "./delete-one.js";
import { SavedColor } from "./utils/saved-color.js";
import { getColor, getHsv } from "./utils/utils.js";
import { BellaPreferencesDialog } from "./prefs.js";
import { colorFormats } from "./utils/color-formats.js";

/**
 * Register the CopyColorButton class
 * in the GObject system before using it
 * in the window.ui builder definition.
 */
import "./copy-color-button.js";

const xdpPortal = Xdp.Portal.new();

export const BellaWindow = GObject.registerClass(
  {
    GTypeName: "BellaWindow",
    Template: getResourceUri("window.ui"),
    InternalChildren: [
      "main_stack",
      "eye_dropper_saved_color_stack",
      "colorDialogBtn",
      "toast_overlay",
      "saved_colors_selection_model",
      "picked_colors_stack",
      "column_view",
      // Color format page
      "hex_action_row",
      "hex_copy_button",
      "rgb_action_row",
      "rgb_copy_button",
      "rgb_percent_action_row",
      "rgb_percent_copy_button",
      "hsl_action_row",
      "hsl_copy_button",
      "hsv_action_row",
      "hsv_copy_button",
      "cmyk_action_row",
      "cmyk_copy_button",
      "hwb_action_row",
      "hwb_copy_button",
      "xyz_action_row",
      "xyz_copy_button",
      "lab_action_row",
      "lab_copy_button",
      "lch_action_row",
      "lch_copy_button",
      "oklab_action_row",
      "oklab_copy_button",
      "oklch_action_row",
      "oklch_copy_button",
      "color_name_action_row",
      "color_name_copy_button",
    ],
    Properties: {
      btn_label: GObject.ParamSpec.string(
        "btn_label",
        "btnLabel",
        "A simple button label",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      color_format: GObject.ParamSpec.string(
        "color_format",
        "colorFormat",
        "Selected color format",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      visible_color_id: GObject.ParamSpec.string(
        "visible_color_id",
        "visibleColorId",
        "Id of the color visible on the details page",
        GObject.ParamFlags.READWRITE,
        ""
      ),
      settings: GObject.ParamSpec.object(
        "settings",
        "Settings",
        "The main window settings",
        GObject.ParamFlags.READWRITE,
        Gio.Settings
      ),
    },
  },
  class BellaWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });
      this.loadStyles();
      this.createModel();
      this.createToast();
      this.bindProperty();
      this.bindSettings();
      this.createActions();
      this.seColorScheme();
      this.getSavedColors();
      this.centerColumnTitle();
    }

    vfunc_close_request() {
      const model = this._saved_colors_selection_model.model;
      const pickedColors = [];

      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        const pickedColor = { id: item.id.unpack() };

        for (const { key } of colorFormats) {
          pickedColor[key] = item[key];
        }
        pickedColors.push(pickedColor);
      }
      this.saveData(pickedColors);
    }

    loadStyles = () => {
      const cssProvider = new Gtk.CssProvider();
      cssProvider.load_from_resource(getResourcePath("index.css"));

      Gtk.StyleContext.add_provider_for_display(
        this.display,
        cssProvider,
        Gtk.STYLE_PROVIDER_PRIORITY_USER
      );
    };

    createModel = () => {
      const model = Gio.ListStore.new(SavedColor);
      this._saved_colors_selection_model.model = model;
    };

    bindSettings = () => {
      if (!this.settings) {
        this.settings = Gio.Settings.new(pkg.name);
      }
      this.settings.bind(
        "window-width",
        this,
        "default-width",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-height",
        this,
        "default-height",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "window-maximized",
        this,
        "maximized",
        Gio.SettingsBindFlags.DEFAULT
      );
      this.settings.bind(
        "color-format",
        this,
        "color_format",
        Gio.SettingsBindFlags.GET
      );

      this.settings.connect("changed::preferred-theme", this.seColorScheme);
      this.settings.connect("changed::color-format", this.updateColorFormat);
    };

    bindProperty = () => {
      const model = this._saved_colors_selection_model.model;
      model.bind_property_full(
        "n_items",
        this._picked_colors_stack,
        "visible-child-name",
        GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE,
        (binding, numItems) => {
          const visiblePage = numItems
            ? "saved_colors_stack_page_inner"
            : "no_saved_colors_stack_page";
          return [true, visiblePage];
        },
        null
      );
    };

    centerColumnTitle = () => {
      try {
        const colorColumnViewTitle = this._column_view
          ?.get_first_child()
          ?.get_first_child();
        const actionsColumnViewTitle = colorColumnViewTitle?.get_next_sibling();

        colorColumnViewTitle?.get_first_child()?.set_halign(Gtk.Align.CENTER);
        actionsColumnViewTitle?.get_first_child()?.set_halign(Gtk.Align.CENTER);
      } catch (error) {
        console.error(error);
      }
    };

    createActions = () => {
      const showPrefsWin = Gio.SimpleAction.new("preferences", null);

      const delSavedColors = Gio.SimpleAction.new(
        "delete-saved-colors",
        GLib.VariantType.new("s")
      );

      const copySavedCol = Gio.SimpleAction.new(
        "copy-saved-color",
        GLib.VariantType.new("s")
      );

      const delSavedColor = Gio.SimpleAction.new(
        "delete-saved-color",
        GLib.VariantType.new("s")
      );

      const viewSavedColor = Gio.SimpleAction.new(
        "view-saved-color",
        GLib.VariantType.new("s")
      );

      const backToMainPage = Gio.SimpleAction.new("back", null);
      const pickColor = Gio.SimpleAction.new("pick-color", null);

      const setEyeDropperStackPage = Gio.SimpleAction.new(
        "set_eye_dropper_stack_page",
        GLib.VariantType.new("s")
      );

      const setSavedColorStackPage = Gio.SimpleAction.new(
        "set_saved_colors_stack_page",
        GLib.VariantType.new("s")
      );

      showPrefsWin.connect("activate", () => {
        const preferencesWindow = new BellaPreferencesDialog();
        preferencesWindow.present(this);
      });

      delSavedColors.connect("activate", (action, alertDialogResponse) => {
        const response = alertDialogResponse?.unpack();
        const model = this._saved_colors_selection_model.model;

        // Nothing to delete. Consider making the 'delete all saved colors'
        // button inactive in the future if there are no items left
        if (model.n_items === 0) return;

        if (response === "delete") {
          model.remove_all();
          this.saveData([]);
          this.displayToast(_("Deleted all saved colors"));
        }
      });

      copySavedCol.connect("activate", (_copySavedColorAction, savedColor) => {
        const color = savedColor?.unpack();
        if (color) {
          this.copyToClipboard(color);
          this.displayToast(_("Copied %s to clipboard").format(color));
        }
      });

      delSavedColor.connect("activate", (_deleteSavedColorAction, colorId) => {
        const confirmDeleteOne = new ConfirmDeleteOne();

        confirmDeleteOne.connect("response", (actionDialog, response) => {
          if (response === "cancel") return;

          const id = colorId?.unpack();
          const [idx, item] = this.getItem(id);

          if (idx === null) {
            throw new Error(`id: ${id} is non-existent`);
          }

          const model = this._saved_colors_selection_model.model;
          model.remove(idx);

          // Only display toast if there are items in the model otherwise the
          // view will switch automatically to "No Saved Color". That's
          // enough to indicate that the operation was a success.
          if (model.n_items > 0) {
            this.displayToast(_("Deleted saved color successfully"));
          }
        });

        confirmDeleteOne.present(this);
      });

      viewSavedColor.connect("activate", (_, colorId) => {
        const id = colorId?.unpack();
        const [idx, item] = this.getItem(id);

        if (idx === null) {
          throw new Error(_("id: %s doesn't existent").format(id));
        }

        this.updatePickedColor(item);
        this._main_stack.visible_child_name = "picked_color_page";

        const color = new Gdk.RGBA();
        color.parse(item.rgb);

        this._colorDialogBtn.set_rgba(color);
      });

      backToMainPage.connect("activate", () => {
        this._main_stack.visible_child_name = "main_page";
        this.visible_color_id = "";
      });

      pickColor.connect("activate", this.pickColorHandler);

      setEyeDropperStackPage.connect("activate", (action, params) => {
        const visibleChildName = params?.unpack();
        if (visibleChildName) {
          this._eye_dropper_saved_color_stack.visible_child_name =
            visibleChildName;
        }
      });

      setSavedColorStackPage.connect("activate", (actionObj, params) => {
        const visibleChildName = params?.unpack();
        if (visibleChildName) {
          this._eye_dropper_saved_color_stack.visible_child_name =
            visibleChildName;
        }
      });

      // Window-scoped actions
      this.add_action(copySavedCol);
      this.add_action(delSavedColor);
      this.add_action(viewSavedColor);
      this.add_action(backToMainPage);
      this.add_action(pickColor);
      this.add_action(setEyeDropperStackPage);
      this.add_action(setSavedColorStackPage);

      // Application-scoped actions
      this.application.add_action(delSavedColors);
      this.application.add_action(showPrefsWin);

      // Add it to gloabThis so that it is triggered from a modal
      globalThis.deleteSavedColorsAction = delSavedColors;
    };

    pickColorHandler = () => {
      const cancellable = Gio.Cancellable.new();

      /**
       * Beware the pick color operation will fail if the
       * user fails to pick color within 24 - 25 seconds.
       * This could be because the operation is being timed
       * internally. Not very sure what's happening here.
       *
       * There's need to dig deeper. Even if the operation
       * fails, control is not handed back to the application
       * until the user clicks somewhere.
       */

      xdpPortal.pick_color(null, cancellable, (source_object, result) => {
        try {
          const gVariant = xdpPortal.pick_color_finish(result);

          const scaledRgb = [0, 0, 0];

          for (let i = 0; i < scaledRgb.length; i++) {
            scaledRgb[i] = gVariant.get_child_value(i).get_double();
          }

          const pickedColor = getColor(scaledRgb);
          pickedColor.hsv = getHsv(Gtk.rgb_to_hsv(...scaledRgb));
          pickedColor.id = GLib.uuid_string_random();

          this.updatePickedColor(pickedColor);
          this.addNewColor(pickedColor);

          this._main_stack.visible_child_name = "picked_color_page";
          const color = new Gdk.RGBA();
          color.parse(pickedColor.rgb);

          this._colorDialogBtn.set_rgba(color);
        } catch (err) {
          if (err instanceof GLib.Error) {
            if (err.matches(Gio.IOErrorEnum, Gio.IOErrorEnum.FAILED)) {
              this.displayToast(_("Failed to pick color"));
              return;
            }
          }
          console.log(err);
        }
      });
    };

    selectColorHandler(colorDialogBtn) {
      const scaledRgb = [
        colorDialogBtn.rgba.red,
        colorDialogBtn.rgba.green,
        colorDialogBtn.rgba.blue,
      ];

      const colorObject = getColor(scaledRgb);
      colorObject.hsv = getHsv(Gtk.rgb_to_hsv(...scaledRgb));

      colorObject.id = this.visible_color_id;
      this.updatePickedColor(colorObject);
      this.updateSavedColor(colorObject);
    }

    seColorScheme = () => {
      const preferredColorScheme = this.settings.get_string("preferred-theme");
      const { DEFAULT, FORCE_LIGHT, FORCE_DARK } = Adw.ColorScheme;
      let colorScheme = DEFAULT;

      if (preferredColorScheme === "system") {
        colorScheme = DEFAULT;
      }

      if (preferredColorScheme === "light") {
        colorScheme = FORCE_LIGHT;
      }

      if (preferredColorScheme === "dark") {
        colorScheme = FORCE_DARK;
      }

      this.application.get_style_manager().color_scheme = colorScheme;
    };

    updateColorFormat = () => {
      const model = this._saved_colors_selection_model.model;

      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        const itemClone = { id: item.id.unpack() };

        for (const { key } of colorFormats) {
          itemClone[key] = item[key];
        }

        model.splice(i, 1, [new SavedColor(itemClone, this.color_format)]);
      }
    };

    getSavedColors = () => {
      const filePath = savedColorsFile.get_path();
      const fileExists = GLib.file_test(filePath, GLib.FileTest.EXISTS);

      if (fileExists) {
        const [success, arrBuff] = GLib.file_get_contents(filePath);

        if (success) {
          const decoder = new TextDecoder("utf-8");
          const pickedColors = JSON.parse(decoder.decode(arrBuff));

          const { model } = this._saved_colors_selection_model;

          for (const pickedColor of pickedColors) {
            model.append(new SavedColor(pickedColor, this.color_format));
          }
        } else {
          console.log(_("Failed to read saved data"));
        }
      } else {
        console.log(_("File doesn't exist yet"));
      }
    };

    saveData = (data = []) => {
      const fileCreationFlag = GLib.mkdir_with_parents(
        savedColorsFile.get_parent().get_path(),
        0o777 // File permission, ugo+rwx, in numeric mode
      );

      if (fileCreationFlag === 0) {
        const [success, tag] = savedColorsFile.replace_contents(
          JSON.stringify(data),
          null,
          false,
          Gio.FileCreateFlags.REPLACE_DESTINATION,
          null
        );

        if (success) {
          console.log(_("Successfully saved picked colors to file"));
        } else {
          console.log(_("Failed to save picked colors to file"));
        }
      }

      if (fileCreationFlag === -1) {
        console.log(_("An error occurred while creating directory"));
      }
    };

    createToast = (timeout = 1) => {
      this.toast = new Adw.Toast({ timeout });
    };

    displayToast = (message) => {
      this.toast.dismiss();
      this.toast.title = message;
      this._toast_overlay.add_toast(this.toast);
    };

    copyToClipboard = (text) => {
      const clipboard = this.display.get_clipboard();
      const contentProvider = Gdk.ContentProvider.new_for_value(text);
      clipboard.set_content(contentProvider);
    };

    getItem = (id) => {
      const model = this._saved_colors_selection_model.model;
      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        if (item.id.unpack() === id) {
          return [i, item];
        }
      }
      return [null, null];
    };

    addNewColor = (pickedColor = {}) => {
      const model = this._saved_colors_selection_model.model;
      model.append(new SavedColor(pickedColor, this.color_format));
    };

    updateSavedColor = (pickedColor = {}) => {
      const model = this._saved_colors_selection_model.model;
      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        if (item.id.unpack() === pickedColor.id) {
          const newColor = new SavedColor(pickedColor, this.color_format);
          model.splice(i, 1, [newColor]);
        }
      }
    };

    updatePickedColor = (pickedColor = {}) => {
      this._hex_action_row.subtitle = pickedColor.hex;
      this._hex_copy_button.colorFormat = pickedColor.hex;

      this._rgb_action_row.subtitle = pickedColor.rgb;
      this._rgb_copy_button.colorFormat = pickedColor.rgb;

      this._rgb_percent_action_row.subtitle = pickedColor.rgb_percent;
      this._rgb_percent_copy_button.colorFormat = pickedColor.rgb_percent;

      this._hsl_action_row.subtitle = pickedColor.hsl;
      this._hsl_copy_button.colorFormat = pickedColor.hsl;

      this._hsv_action_row.subtitle = pickedColor.hsv;
      this._hsv_copy_button.colorFormat = pickedColor.hsv;

      this._cmyk_action_row.subtitle = pickedColor.cmyk;
      this._cmyk_copy_button.colorFormat = pickedColor.cmyk;

      this._hwb_action_row.subtitle = pickedColor.hwb;
      this._hwb_copy_button.colorFormat = pickedColor.hwb;

      this._xyz_action_row.subtitle = pickedColor.xyz;
      this._xyz_copy_button.colorFormat = pickedColor.xyz;

      this._lab_action_row.subtitle = pickedColor.lab;
      this._lab_copy_button.colorFormat = pickedColor.lab;

      this._lch_action_row.subtitle = pickedColor.lch;
      this._lch_copy_button.colorFormat = pickedColor.lch;

      this._oklab_action_row.subtitle = pickedColor.oklab;
      this._oklab_copy_button.colorFormat = pickedColor.oklab;

      this._oklch_action_row.subtitle = pickedColor.oklch;
      this._oklch_copy_button.colorFormat = pickedColor.oklch;

      this._color_name_action_row.subtitle = pickedColor.name;
      this._color_name_copy_button.colorFormat = pickedColor.name;

      const { id } = pickedColor;
      this.visible_color_id = typeof id === "string" ? id : id.unpack();
    };

    copyColorFormat(copyColorFormatButton) {
      const color = copyColorFormatButton.colorFormat;
      this.copyToClipboard(color);
      this.displayToast(_("Copied %s to clipboard").format(color));
    }
  }
);
