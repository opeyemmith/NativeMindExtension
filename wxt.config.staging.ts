import { defu } from 'defu'
import { defineConfig } from 'wxt'

import config from './wxt.config'

const BETA = 'BETA'
const BETA_DESC = 'THIS EXTENSION IS FOR BETA TESTING'

// See https://wxt.dev/api/config.html
export default defineConfig(
  defu(
    {
      mode: 'staging',
      manifest: {
        name: `__MSG_extName__ ${BETA}`,
        description: `__MSG_extDesc__ ${BETA_DESC}`,
      },
      autoIcons: {
        baseIconPath: 'assets/icon.png',
      },
    },
    config,
  ),
)
