import tailwindcss from '@tailwindcss/vite'
import vueJsx from '@vitejs/plugin-vue-jsx'
import svgLoader from 'vite-svg-loader'
import { defineConfig } from 'wxt'

import { version } from './package.json'

export const VERSION = version.split('-')[0]

const IS_FIREFOX = process.argv.includes('firefox')

const permissionsForChrome = ['system.memory']
const permissionsForFirefox = ['menus']
const extraPermissions = IS_FIREFOX ? permissionsForFirefox : permissionsForChrome

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
  imports: false,
  modules: ['@wxt-dev/module-vue', './wxt-modules/auto-icons/index.mjs', './wxt-modules/expose-web-resources/index.mjs'],
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
  zip: {
    artifactTemplate: '{{name}}-{{packageVersion}}-{{browser}}-{{mode}}.zip',
  },
  exposeWebResources: {
    paths: ['/assets/*.woff2', '/content-scripts/*.css', '/main-world-injected.js'],
  },
  hooks: {
    // replace the default svg-loader plugin provided by wxt with our custom one
    'vite:build:extendConfig': (_entrypoint, config) => {
      const idx = config.plugins?.findIndex((plugin) => plugin && 'name' in plugin && plugin.name === 'svg-loader')
      if (idx === undefined || idx === -1) {
        config.plugins = config.plugins || []
        config.plugins.push(svgLoaderPlugin)
        return
      }
      else {
        config.plugins?.splice(idx, 1, svgLoaderPlugin)
      }
    },
  },
  vite: (_env) => {
    return {
      build: {
        target: ['chrome124', 'firefox120', 'safari16'],
      },
      plugins: [
        vueJsx({ babelPlugins: ['@babel/plugin-proposal-explicit-resource-management'] }),
        tailwindcss(),
      ],
    }
  },
  manifest: {
    name: '__MSG_extName__',
    description: '__MSG_extDesc__',
    version: VERSION,
    default_locale: 'en',
    permissions: ['declarativeNetRequest', 'tabs', 'storage', 'scripting', 'contextMenus', ...extraPermissions],
    minimum_chrome_version: '124',
    declarative_net_request: IS_FIREFOX ? { rule_resources: [{ id: 'ruleset_1', enabled: true, path: 'rules.json' }] } : undefined,
    content_security_policy: {
      extension_pages: 'script-src \'self\' \'wasm-unsafe-eval\'; object-src \'self\';',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        js: ['/main-world-injected.js'],
        run_at: 'document_start',
        world: 'MAIN',
      },
    ],
    host_permissions: ['*://*/*'],
  },
})
