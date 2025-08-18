import { sleep } from '@/utils/async'
import { b2sRpc } from '@/utils/rpc'

const checkSidepanelLoaded = async () => {
  try {
    return await Promise.race([
      b2sRpc.getSidepanelStatus().then((status) => !!status.loaded),
      sleep(1000).then(() => false), // Increased timeout to reduce noise
    ])
  }
  catch (error) {
    // Expected when sidepanel is not ready - don't log as error
    return false
  }
}

export async function waitForSidepanelLoaded() {
  const start = Date.now()
  while (!(await checkSidepanelLoaded())) {
    if (Date.now() - start > 5000) {
      // Don't throw error - just return, let the subsequent emit handle the timeout gracefully
      return
    }
    await sleep(500)
  }
}
