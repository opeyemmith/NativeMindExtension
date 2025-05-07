import { defineConfig } from "wxt";
import { VERSION } from "./utils/constants";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-vue", "@wxt-dev/auto-icons"],
  runner: {
    chromiumArgs: ["--lang=en_US"],
  },
  autoIcons: {
    baseIconPath: "assets/icon.png",
  },
  zip: {
    artifactTemplate: "{{name}}-{{version}}-{{browser}}-{{mode}}.zip",
    includeSources: [".env.production", ".nvmrc"],
  },
  manifest: {
    name: "__MSG_extName__",
    description: "__MSG_extDesc__",
    version: VERSION,
    default_locale: "en",
    permissions: ["declarativeNetRequest", "tabs", "storage"],
    host_permissions: ["<all_urls>"],
  },
});
