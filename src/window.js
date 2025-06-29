import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Xdp from "gi://Xdp";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import { savedColorsFile } from "./app.js";
import { ConfirmDeleteOne } from "./delete-one.js";
import { BellaPreferencesDialog } from "./prefs.js";
import { SavedColor } from "./utils/saved-color.js";
import { colorFormats } from "./utils/color-formats.js";
import { getColor, getHsv, settings } from "./utils/utils.js";
import { Color, colorProps } from "./utils/gobjects.js";

/**
 * Register the CopyColorButton class
 * in the GObject system before using it
 * in the window.ui builder definition.
 */
import "./copy-color-button.js";

const testColor = [0.20784313725490197, 0.5176470588235295, 0.8941176470588236];
const pickedColor = getColor(testColor);
pickedColor.hsv = getHsv(Gtk.rgb_to_hsv(...testColor));
pickedColor.id = GLib.uuid_string_random();
pickedColor.displayed_format = pickedColor.rgb;

const actionButtons = [
  {
    iconName: "bella-edit-copy-symbolic",
    tooltipText: _("Copy color"),
  },
  {
    iconName: "bella-user-trash-symbolic",
    tooltipText: _("Delete color"),
  },
  {
    iconName: "bella-view-reveal-symbolic",
    tooltipText: _("View details"),
  },
];

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
      "picked_colors_stack",
      "column_view",
      "color_name_pref_group",
      "color_format_pref_group",
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
      visible_color: GObject.ParamSpec.object(
        "visible_color",
        "visibleColor",
        "Color formats to display on picked color page",
        GObject.ParamFlags.READWRITE,
        Color
      ),
    },
  },
  class BellaWindow extends Adw.ApplicationWindow {
    constructor(application) {
      super({ application });
      this.loadStyles();
      this.createModel();
      this.createToast();
      this.bindSettings();
      this.createActions();
      this.setColorScheme();
      this.createColorPage();
      // this.getSavedColors();
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

    createColorPage = () => {
      const object = {};
      for (const { key } of colorProps) {
        object[key] = "";
      }

      object.id = GLib.uuid_string_random();
      object.displayed_format = "rgb"; // Get this from settings
      this.visible_color = new Color(object);

      const bindProps = colorProps.filter(({ key }) => {
        return key !== "id" && key !== "name" && key !== "displayed_format";
      });

      for (const { key, description } of bindProps) {
        const button = new Gtk.Button({
          icon_name: "bella-edit-copy-symbolic",
          valign: Gtk.Align.CENTER,
          halign: Gtk.Align.END,
          tooltip_text: _("Copy color"),
          css_classes: ["suggested-action"],
        });

        button.connect("clicked", () => {
          console.log(key);
        });

        const actionRow = new Adw.ActionRow({
          title: description,
          css_classes: ["property"],
        });
        actionRow.add_suffix(button);

        this.visible_color.bind_property(
          key,
          actionRow,
          "subtitle",
          GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE
        );

        this._color_format_pref_group.add(actionRow);
      }

      const nameProp = colorProps.find(({ key }) => key === "name");
      if (!nameProp) {
        throw new Error("name not found in color props");
      }

      const button = new Gtk.Button({
        icon_name: "bella-edit-copy-symbolic",
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        tooltip_text: _("Copy color"),
        css_classes: ["suggested-action"],
      });

      button.connect("clicked", () => {
        console.log(nameProp.key);
      });

      const actionRow = new Adw.ActionRow({
        title: nameProp.description,
        css_classes: ["property"],
      });
      actionRow.add_suffix(button);

      this.visible_color.bind_property(
        nameProp.key,
        actionRow,
        "subtitle",
        GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE
      );
      this._color_name_pref_group.add(actionRow);
    };

    createModel = () => {
      const model = Gtk.NoSelection.new(Gio.ListStore.new(Color));
      this._column_view.model = model;

      for (let i = 0; i < 10; i++) {
        model.model.append(new Color({ ...pickedColor }));
      }

      const colorFactory = new Gtk.SignalListItemFactory();
      const actionsFactory = new Gtk.SignalListItemFactory();

      colorFactory.connect("setup", (factory, listItem) => {
        listItem.child = new Gtk.Box({
          halign: Gtk.Align.START,
          valign: Gtk.Align.CENTER,
          homogeneous: true,
        });
        listItem.child.append(new Gtk.Entry({ editable: false }));
      });

      actionsFactory.connect("setup", (factory, listItem) => {
        listItem.child = new Gtk.Box({
          halign: Gtk.Align.START,
          valign: Gtk.Align.CENTER,
          homogeneous: true,
          spacing: 20,
        });

        for (const { iconName, tooltipText } of actionButtons) {
          const button = new Gtk.Button({
            icon_name: iconName,
            tooltip_text: tooltipText,
            css_classes: ["suggested-action"],
          });
          listItem.child.append(button);
        }
      });

      colorFactory.connect("bind", (factory, listItem) => {
        const hBox = listItem.child;
        const color = listItem.item;

        const buffer = hBox?.get_first_child()?.buffer;
        color.bind_property(
          "displayed_format",
          buffer,
          "text",
          GObject.BindingFlags.SYNC_CREATE
        );
      });

      actionsFactory.connect("bind", (factory, listItem) => {
        const hBox = listItem.child;
        const color = listItem.item;

        /**
         * These bindings will create as many signal handlers as
         * there are bound itmes. Investigate if this is efficient.
         */
        const copyButton = hBox.get_first_child();
        copyButton?.connect("clicked", (button) => {
          this.copyColor(button, color.displayed_format);
        });

        const deleteButton = copyButton.get_next_sibling();
        deleteButton?.connect("clicked", (button) => {
          this.deleteColor(button, color.id);
        });

        const viewButton = hBox.get_last_child();
        viewButton?.connect("clicked", (button) => {
          this.viewColor(button, color.id);
        });
      });

      const colorColumn = Gtk.ColumnViewColumn.new(_("Color"), colorFactory);
      const actionsColumn = Gtk.ColumnViewColumn.new(
        _("Actions"),
        actionsFactory
      );

      this._column_view.append_column(colorColumn);
      this._column_view.append_column(actionsColumn);

      /** These should be called after creating ColumnView */
      this.bindModel();
      this.centerColumnTitle();
    };

    copyColor = (button, color) => {
      this.copyToClipboard(color);
      this.displayToast(_("Copied %s").format(color));
    };

    deleteColor = (button, id) => {
      const model = this._column_view.model.model;
      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        if (item.id === id) {
          model.remove(i);
          this.displayToast(_("Deleted %s").format(item.displayed_format));
          break;
        }
      }
    };

    viewColor = (button, id) => {
      console.log("Viewing ", id);
    };

    bindSettings = () => {
      settings.bind(
        "window-width",
        this,
        "default-width",
        Gio.SettingsBindFlags.DEFAULT
      );
      settings.bind(
        "window-height",
        this,
        "default-height",
        Gio.SettingsBindFlags.DEFAULT
      );
      settings.bind(
        "window-maximized",
        this,
        "maximized",
        Gio.SettingsBindFlags.DEFAULT
      );
      settings.bind(
        "color-format",
        this,
        "color_format",
        Gio.SettingsBindFlags.GET
      );

      settings.connect("changed::color-scheme", this.setColorScheme);
      settings.connect("changed::color-format", this.updateColorFormat);
    };

    bindModel = () => {
      const model = this._column_view.model.model;
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

      copySavedCol.connect("activate", (action, savedColor) => {
        const color = savedColor?.unpack();
        if (color) {
          this.copyToClipboard(color);
          this.displayToast(_("Copied %s").format(color));
        }
      });

      delSavedColor.connect("activate", (action, colorId) => {
        const confirmDeleteOne = new ConfirmDeleteOne();

        confirmDeleteOne.connect("response", (dialog, response) => {
          if (response === "cancel") return;

          const id = colorId?.unpack();
          const [idx, item] = this.getItem(id);

          if (idx === null) {
            throw new Error(`id: ${id} is non-existent`);
          }

          const model = this._saved_colors_selection_model.model;
          model.remove(idx);

          /**
           * Only display toast if there are items in the model otherwise the
           * view will switch automatically to "No Saved Color". That's
           * enough to indicate that the operation was a success.
           */
          if (model.n_items > 0) {
            this.displayToast(_("Deleted color"));
          }
        });

        confirmDeleteOne.present(this);
      });

      viewSavedColor.connect("activate", (action, colorId) => {
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

      setSavedColorStackPage.connect("activate", (action, params) => {
        const visibleChildName = params?.unpack();
        if (visibleChildName) {
          this._eye_dropper_saved_color_stack.visible_child_name =
            visibleChildName;
        }
      });

      this.add_action(copySavedCol);
      this.add_action(delSavedColor);
      this.add_action(viewSavedColor);
      this.add_action(backToMainPage);
      this.add_action(pickColor);
      this.add_action(setEyeDropperStackPage);
      this.add_action(setSavedColorStackPage);

      this.application.add_action(delSavedColors);
      this.application.add_action(showPrefsWin);
      this.application.add_action(settings.create_action("color-scheme"));

      /* Add to gloabThis so that it is triggered from a modal */
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
          const rgb = gVariant?.deepUnpack();
          const color = getColor(rgb);

          for (const prop in color) {
            this.visible_color[prop] = color[prop];
          }

          this._main_stack.visible_child_name = "picked_color_page";

          const rgba = new Gdk.RGBA();
          rgba.parse(pickedColor.rgb);
          this._colorDialogBtn.set_rgba(rgba);
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

      // colorObject.id = this.visible_color_id;
      // this.updatePickedColor(colorObject);
      // this.updateSavedColor(colorObject);
    }

    setColorScheme = () => {
      const styleManager = this.application.style_manager;
      styleManager.set_color_scheme(settings.get_int("color-scheme"));
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

    copyColorFormat(copyColorFormatButton) {
      const color = copyColorFormatButton.colorFormat;
      this.copyToClipboard(color);
      this.displayToast(_("Copied %s").format(color));
    }
  }
);
