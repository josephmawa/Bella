import Adw from "gi://Adw?version=1";
import Gtk from "gi://Gtk";

const GITHUB_URL = "https://github.com/josephmawa/Bella";
const translators = [
  "Sabri Ünal",
  "volkov",
  "John Peter Sa",
  "Heimen Stoffels",
];

const aboutParams = {
  application_name: APP_NAME,
  application_icon: pkg.name,
  version: pkg.version,
  license_type: Gtk.License.LGPL_3_0,
  presentation_mode: Adw.DialogPresentationMode.FLOATING,
  developer_name: "Joseph Mawa",
  developers: ["Joseph Mawa"],
  artists: ["Joseph Mawa"],
  copyright: "Copyright © 2024 Joseph Mawa",
  translator_credits: translators.join("\n"),
  website: GITHUB_URL,
  issue_url: GITHUB_URL + "/issues",
  support_url: GITHUB_URL + "/issues",
};

export const getAboutDialog = () => {
  return new Adw.AboutDialog(aboutParams);
};
