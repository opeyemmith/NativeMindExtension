import { defineConfig } from 'wxt'
import { VERSION } from './utils/constants'
import tailwindcss from '@tailwindcss/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import svgLoader from 'vite-svg-loader'
import webfontDownload from 'vite-plugin-webfont-dl';

const IS_FIREFOX = process.argv.includes('firefox')

const permissionsForChrome = ['system.memory']
const extraPermissions = IS_FIREFOX ? [] : permissionsForChrome

const svgLoaderPlugin = svgLoader({
  svgoConfig: {
    multipass: true,
    plugins: [
      {
        name: 'preset-default',
        params: {
          overrides: {
            // @see https://github.com/svg/svgo/issues/1128
            removeViewBox: false,
            cleanupIds: {
              minify: false,
              remove: false,
            },
          },
        },
      },
      'prefixIds',
    ],
  },
})

svgLoaderPlugin.enforce = 'pre'
svgLoaderPlugin.name = 'svg-loader'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue', './wxt-modules/auto-icons/index.mjs'],
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  zip: {
    artifactTemplate: '{{name}}-{{packageVersion}}-{{browser}}-{{mode}}.zip',
  },
  hooks: {
    // replace the default svg-loader plugin provided by wxt with our custom one
    "vite:build:extendConfig": (_entrypoint, config) => {
      const idx = config.plugins?.findIndex(plugin => plugin && 'name' in plugin && plugin.name === 'svg-loader')
      if (idx === undefined || idx === -1) {
        config.plugins = config.plugins || []
        config.plugins.push(svgLoaderPlugin)
        return
      } else {
        config.plugins?.splice(idx, 1, svgLoaderPlugin)
      }
    },
  },
  vite: _env => {
    return {
      plugins: [
        webfontDownload([
          'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap'
        ]),
        vueJsx({ babelPlugins: ['@babel/plugin-proposal-explicit-resource-management'] }),
        tailwindcss(),
      ] as any[],
    }
  },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDesc__',
    version: VERSION,
    default_locale: 'en',
    permissions: ['declarativeNetRequest', 'tabs', 'storage', 'scripting', 'contextMenus', ...extraPermissions],
    minimum_chrome_version: '124',
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    web_accessible_resources: [
      {
        resources: ['/tutorial.html', '/main-world-injected.js'],
        matches: ['<all_urls>'],
      },
    ],
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['/main-world-injected.js'],
        run_at: 'document_start',
        world: 'MAIN',
      }
    ],
    host_permissions: ['*://*/*'],
  },
})
