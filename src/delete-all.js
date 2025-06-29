import Adw from "gi://Adw";
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
  }
);
