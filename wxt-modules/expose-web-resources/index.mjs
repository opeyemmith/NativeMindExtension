// this module is forked from wxt-modules/auto-icons and fixed to work
// ref: https://github.com/wxt-dev/wxt/pull/1616

import 'wxt'

import defu from 'defu'
import { globSync } from 'glob'
import { defineWxtModule } from 'wxt/modules'

const index = defineWxtModule({
  name: '@wxt-dev/expose-web-resources',
  configKey: 'exposeWebResources',
  async setup(wxt, options) {
    const parsedOptions = defu(
      options,
      {
        paths: [],
      },
    )
    wxt.hooks.hook('build:manifestGenerated', async (wxt2, manifest) => {
      const outputDir = wxt2.config.outDir
      const resources = globSync(parsedOptions.paths, {
        root: outputDir,
      })
      manifest.web_accessible_resources = manifest.web_accessible_resources || []
      manifest.web_accessible_resources.push({
        resources: resources.map((resource) => resource.replace(outputDir, '')),
        matches: ['<all_urls>'],
      })
    })
  },
})

export { index as default }
