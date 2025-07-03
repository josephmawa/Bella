import Adw from "gi://Adw";
import Gdk from "gi://Gdk";
import Gio from "gi://Gio";
import Xdp from "gi://Xdp";
import GLib from "gi://GLib";
import GObject from "gi://GObject";
import Gtk from "gi://Gtk?version=4.0";

import { savedColorsFile } from "./app.js";
import { ConfirmDeleteOne } from "./delete-one.js";
import { ConfirmDeleteAll } from "./delete-all.js";
import { BellaPreferencesDialog } from "./prefs.js";
import { CopyColorButton } from "./copy-color-button.js";
import { Color, colorProps } from "./utils/gobjects.js";
import { getColor, getHsv, settings } from "./utils/utils.js";

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
const filePath = GLib.build_filenamev([
  GLib.get_user_data_dir(),
  "colors",
  "data.json",
]);
const colorsFile = Gio.File.new_for_path(filePath);
/** Tracking ColorDialogButton notify::rgba signal ID */
const signalId = { id: null };

export const BellaWindow = GObject.registerClass(
  {
    GTypeName: "BellaWindow",
    Template: getResourceUri("window.ui"),
    InternalChildren: [
      "main_stack",
      "eye_dropper_saved_color_stack",
      "color_dialog_button",
      "toast_overlay",
      "picked_colors_stack",
      "column_view",
      "color_name_pref_group",
      "color_format_pref_group",
    ],
    Properties: {
      color_format: GObject.ParamSpec.string(
        "color_format",
        "colorFormat",
        "Selected color format",
        GObject.ParamFlags.READWRITE,
        ""
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
      this.deleteColors();
      this.createActions();
      this.setColorScheme();
      this.createColorPage();
      this.connectMainStack();
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
      object.displayed_format = this.color_format;
      this.visible_color = new Color(object);

      const bindProps = colorProps.filter(({ key }) => {
        return (
          key !== "id" &&
          key !== "srgb" &&
          key !== "name" &&
          key !== "displayed_format"
        );
      });

      for (const { key, description } of bindProps) {
        const button = new CopyColorButton();
        button.connect("clicked", () => {
          this.copyToClipboard(this.visible_color[key]);
          this.displayToast(_("Copied %s").format(this.visible_color[key]));
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

      const button = new CopyColorButton();
      button.connect("clicked", () => {
        this.copyToClipboard(this.visible_color.name);
        this.displayToast(_("Copied %s").format(this.visible_color.name));
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

      /**
       * We could've obtained colorFormat from this.color_format
       * but this method is executed before this.color_format
       * is bound to its corresponding settings.
       */
      const colorFormat = settings.get_string("color-format");
      const savedColors = this.getSavedColors();
      for (const { id, srgb } of savedColors) {
        const rgb = srgb.split(",").map((c) => +c);
        const color = getColor(rgb);
        model.model.append(
          new Color({
            ...color,
            id,
            displayed_format: color[colorFormat],
          })
        );
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
         * there are bound items. Investigate its efficiency.
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
          this.viewColor(button, color);
        });
      });

      const colorColumn = Gtk.ColumnViewColumn.new(_("Color"), colorFactory);
      const actionsColumn = Gtk.ColumnViewColumn.new(
        _("Actions"),
        actionsFactory
      );

      this._column_view.append_column(colorColumn);
      this._column_view.append_column(actionsColumn);

      /** Call this after creating ColumnView */
      this.bindModel();
      this.centerColumnTitle();
    };

    copyColor = (button, color) => {
      this.copyToClipboard(color);
      this.displayToast(_("Copied %s").format(color));
    };

    deleteColor = (button, id) => {
      const confirmDeleteOne = new ConfirmDeleteOne();
      confirmDeleteOne.connect("response", (dialog, response) => {
        if (response === "cancel") return;

        const model = this._column_view.model.model;

        for (let i = 0; i < model.n_items; i++) {
          const item = model.get_item(i);
          if (item.id === id) {
            model.remove(i);
            break;
          }
        }
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
    };

    viewColor = (button, color) => {
      const result = Color.copyProperties(color, this.visible_color);
      if (result) {
        this.setColorDialogButtonRgba(color.rgb);
        /** Switch page after setting the ColorDialogButton RGB */
        this._main_stack.visible_child_name = "picked_color_page";
      }
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

    connectMainStack = () => {
      this._main_stack.connect("notify::visible-child-name", () => {
        const visibleChildName = this._main_stack.visible_child_name;
        if (visibleChildName === "picked_color_page") {
          signalId.id = this._color_dialog_button.connect(
            "notify::rgba",
            this.selectColorHandler
          );
          return;
        }

        if (visibleChildName === "main_page") {
          this._color_dialog_button.disconnect(signalId.id);
          signalId.id = null;
        }
      });
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
      const deleteSavedColors = Gio.SimpleAction.new(
        "delete-saved-colors",
        null
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

      deleteSavedColors.connect("activate", () => {
        const confirmDeleteAll = new ConfirmDeleteAll();

        confirmDeleteAll.connect("response", (dialog, response) => {
          if (response === "cancel") return;

          const model = this._column_view.model.model;
          /**
           * Nothing to delete. Consider making the 'delete all saved colors'
           * button inactive if there are no items left.
           */
          if (model.n_items === 0) return;
          if (response === "delete") {
            model.remove_all();
            this.saveData([]);
            this.displayToast(_("Deleted saved colors"));
          }
        });
        confirmDeleteAll.present(this);
      });

      backToMainPage.connect("activate", () => {
        this._main_stack.visible_child_name = "main_page";
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

      this.add_action(pickColor);
      this.add_action(backToMainPage);
      this.add_action(setEyeDropperStackPage);
      this.add_action(setSavedColorStackPage);

      this.application.add_action(showPrefsWin);
      this.application.add_action(deleteSavedColors);
      this.application.add_action(settings.create_action("color-scheme"));
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

          this._column_view.model.model.append(
            new Color({ ...color, displayed_format: color[this.color_format] })
          );
          this.setColorDialogButtonRgba(color.rgb);
          /** Switch page after setting the ColorDialogButton RGB */
          this._main_stack.visible_child_name = "picked_color_page";
          this.saveData();
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

    setColorDialogButtonRgba = (rgb) => {
      const rgba = new Gdk.RGBA();
      rgba.parse(rgb);
      this._color_dialog_button.set_rgba(rgba);
    };

    selectColorHandler = (dialogButton) => {
      const rgba = dialogButton.rgba;
      const rgb = [rgba.red, rgba.green, rgba.blue];
      const colorId = this.visible_color.id;

      const model = this._column_view.model;
      let searchItem = null;

      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        if (item.id === colorId) {
          searchItem = item;
          break;
        }
      }

      if (!searchItem) {
        throw new Error("Search Item is null");
      }

      const color = getColor(rgb);
      /** getColor generates a new ID. It must be reset to the original ID */
      color.id = colorId;
      color.displayed_format = color[this.color_format];

      const updateListItem = Color.copyProperties(color, searchItem);
      const updateVisibleColor = Color.copyProperties(
        color,
        this.visible_color
      );
      if (updateListItem && updateVisibleColor) {
        this.saveData();
      }
    };

    setColorScheme = () => {
      const styleManager = this.application.style_manager;
      styleManager.set_color_scheme(settings.get_int("color-scheme"));
    };

    updateColorFormat = () => {
      const model = this._column_view.model.model;
      for (let i = 0; i < model.n_items; i++) {
        const item = model.get_item(i);
        item.displayed_format = item[this.color_format];
      }
    };

    deleteColors = () => {
      try {
        const filePath = savedColorsFile.get_path();
        const innerDir = savedColorsFile.get_parent()?.get_path();
        const outerDir = savedColorsFile.get_parent()?.get_parent()?.get_path();
        if (GLib.file_test(filePath, GLib.FileTest.EXISTS)) {
          savedColorsFile.delete(null);
          GLib.rmdir(innerDir);
          GLib.rmdir(outerDir);
          return [filePath, innerDir, outerDir].every((path) => {
            return !GLib.file_test(path, GLib.FileTest.EXISTS);
          });
        } else {
          [innerDir, outerDir].forEach((path) => {
            if (GLib.file_test(path, GLib.FileTest.EXISTS)) {
              GLib.rmdir(path);
            }
          });

          return [filePath, innerDir, outerDir].every((path) => {
            return !GLib.file_test(path, GLib.FileTest.EXISTS);
          });
        }
      } catch (error) {
        console.log(error);
        return false;
      }
    };

    getSavedColors = () => {
      try {
        const filePath = colorsFile.get_path();
        if (!GLib.file_test(filePath, GLib.FileTest.EXISTS)) return [];

        const [success, buffer] = GLib.file_get_contents(filePath);
        if (!success) return [];

        return JSON.parse(new TextDecoder().decode(buffer));
      } catch (error) {
        console.log(error);
        return [];
      }
    };

    saveData = () => {
      try {
        const data = [];
        const model = this._column_view.model.model;
        for (let i = 0; i < model.n_items; i++) {
          const item = model.get_item(i);
          data.push({ id: item.id, srgb: item.srgb });
        }

        const path = colorsFile.get_parent().get_path();
        /* 0o777 is file permission, ugo+rwx, in numeric mode */
        const flag = GLib.mkdir_with_parents(path, 0o777);
        if (flag === -1) {
          throw new Error("Failed to save color");
        }

        if (flag === 0) {
          const [success] = colorsFile.replace_contents(
            JSON.stringify(data),
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null
          );

          if (!success) {
            throw new Error("Failed to save color");
          }
        }
      } catch (error) {
        console.log(error);
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
  }
);
