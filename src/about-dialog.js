import Adw from "gi://Adw?version=1";
import Gtk from "gi://Gtk";

const aboutParams = {
  application_name: globalThis.__APPLICATION_NAME__,
  application_icon: pkg.name,
  version: pkg.version,
  license_type: Gtk.License.LGPL_3_0,
  presentation_mode: Adw.DialogPresentationMode.FLOATING,
  developer_name: "Joseph Mawa",
  developers: ["Joseph Mawa"],
  artists: ["Joseph Mawa"],
  copyright: "Copyright © 2024 Joseph Mawa",
  // The opening and closing backticks shouldn't be on separate lines
  translator_credits: `Sabri Ünal
  volkov
  John Peter Sa`,
  website: "https://github.com/josephmawa/Bella",
  issue_url: "https://github.com/josephmawa/Bella/issues",
  support_url: "https://github.com/josephmawa/Bella/issues",
};

export const getAboutDialog = () => {
  return new Adw.AboutDialog(aboutParams);
};
