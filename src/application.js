import GObject from "gi://GObject";
import Gio from "gi://Gio";
import Adw from "gi://Adw";
import GLib from "gi://GLib";

import { BellaWindow } from "./window.js";
import { getAboutDialog } from "./about-dialog.js";

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
      this.set_accels_for_action("app.preferences", ["<primary>comma"]);
      this.set_accels_for_action("win.back", ["<Alt>Left"]);
      this.set_accels_for_action("win.pick-color", ["<primary>p"]);

      const aboutAction = new Gio.SimpleAction({ name: "about" });
      aboutAction.connect("activate", this.showAbout);
      this.add_action(aboutAction);
    };

    showAbout = () => {
      const aboutDialog = getAboutDialog();
      aboutDialog.present(this.active_window);
    };
  }
);
