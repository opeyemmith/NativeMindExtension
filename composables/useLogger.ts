import { getCurrentInstance } from 'vue'

import logger from '@/utils/logger'

export function useLogger() {
  const instance = getCurrentInstance()
  if (!instance) {
    logger.warn('useLogger called outside of component context')
  }
  const componentName = instance?.type.name || 'UnknownComponent'
  const log = logger.child(componentName)
  return log
}
