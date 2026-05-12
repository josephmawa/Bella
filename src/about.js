import Gtk from "gi://Gtk";
import Adw from "gi://Adw?version=1";

const GITHUB_URL = "https://github.com/josephmawa/Bella";
const aboutParams = {
  application_name: APP_NAME,
  application_icon: pkg.name,
  version: pkg.version,
  license_type: Gtk.License.LGPL_3_0,
  developer_name: "Joseph Mawa",
  developers: ["Joseph Mawa"],
  artists: ["Joseph Mawa"],
  copyright: "© 2024 Joseph Mawa",
  // Translators: Replace "translator-credits" with your name/username, and optionally an email or URL.
  translator_credits: _("translator-credits"),
  website: GITHUB_URL,
  issue_url: GITHUB_URL + "/issues",
  support_url: GITHUB_URL + "/issues",
};

export const getAboutDialog = () => {
  return new Adw.AboutDialog(aboutParams);
};
