import GObject from "gi://GObject";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk?version=4.0";
import Adw from "gi://Adw";
import GLib from "gi://GLib";

import { BellaWindow } from "./window.js";

pkg.initGettext();
pkg.initFormat();

export const savedColorsFile = Gio.File.new_for_path(
  GLib.build_filenamev([
    GLib.get_user_config_dir(),
    "saved-colors",
    "saved-colors.json",
  ])
);

export const BellaApplication = GObject.registerClass(
  class BellaApplication extends Adw.Application {
    constructor() {
      super({
        application_id: pkg.name,
        flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
      });

      this.initActions();
    }

    vfunc_activate() {
      let { active_window } = this;

      if (!active_window) active_window = new BellaWindow(this);

      active_window.present();
    }

    initActions = () => {
      const quitAction = new Gio.SimpleAction({ name: "quit" });
      quitAction.connect("activate", (action) => {
        this.quit();
      });
      this.add_action(quitAction);
      this.set_accels_for_action("app.quit", ["<primary>q"]);

      const aboutAction = new Gio.SimpleAction({ name: "about" });
      aboutAction.connect("activate", this.showAbout);
      this.add_action(aboutAction);
    };

    showAbout = () => {
      const builder = Gtk.Builder.new_from_resource(
        "/io/github/josephmawa/Bella/about-dialog.ui"
      );

      const aboutDialog = builder.get_object("about_dialog");
      aboutDialog.present(this.active_window);
    };
  }
);
