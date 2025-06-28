import Adw from "gi://Adw";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

export const ConfirmDeleteAll = GObject.registerClass(
  {
    GTypeName: "ConfirmDeleteAll",
    Template: getResourceUri("delete-all.ui"),
  },
  class ConfirmDeleteAll extends Adw.AlertDialog {
    constructor() {
      super();
    }

    responseHandler(actionDialog, response) {
      if (response === "cancel") return;
      globalThis.deleteSavedColorsAction.activate(
        new GLib.Variant("s", response)
      );
    }
  }
);
