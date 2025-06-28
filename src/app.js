import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

import { BellaWindow } from "./window.js";
import { getAboutDialog } from "./about.js";

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
      let activeWindow = this.active_window;
      if (!activeWindow) activeWindow = new BellaWindow(this);
      activeWindow.present();
    }

    initActions = () => {
      const quit = Gio.SimpleAction.new("quit", null);
      quit.connect("activate", () => this.quit());
      this.add_action(quit);

      const openAbout = Gio.SimpleAction.new("about", null);
      openAbout.connect("activate", this.showAbout);
      this.add_action(openAbout);

      this.set_accels_for_action("app.quit", ["<primary>q"]);
      this.set_accels_for_action("app.preferences", ["<primary>comma"]);
      this.set_accels_for_action("win.back", ["<Alt>Left"]);
      this.set_accels_for_action("win.pick-color", ["<primary>p"]);
    };

    showAbout = () => {
      const aboutDialog = getAboutDialog();
      aboutDialog.present(this.active_window);
    };
  }
);
