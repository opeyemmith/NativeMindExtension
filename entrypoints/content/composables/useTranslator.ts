import { createSharedComposable, useEventListener } from '@vueuse/core'
import { ref, watch } from 'vue'

import { getTranslatorEnv, handleTranslatorEnvUpdated, init, setTranslatorEnv, toggleTranslation, translation } from '@/entrypoints/content/utils/translator'
import { LanguageCode } from '@/utils/language/detect'
import logger from '@/utils/logger'
import { registerContentScriptRpcEvent } from '@/utils/rpc'
import { getCommonAncestorElement } from '@/utils/selection'
import { getUserConfig } from '@/utils/user-config'

import { setTranslationMenuTargetLanguage } from '../utils/context-menu'

async function _useTranslator() {
  const userConfig = await getUserConfig()
  const targetLocale = userConfig.translation.targetLocale.toRef()
  watch(targetLocale, async (targetLocale) => {
    logger.debug('targetLocale changed', targetLocale)
    const curEnv = await getTranslatorEnv()
    if (targetLocale !== curEnv.targetLocale) {
      setTranslatorEnv({
        targetLocale,
      })
      handleTranslatorEnvUpdated()
    }
    logger.debug(await getTranslatorEnv())
  })

  const enabled = ref(false)
  const isTranslating = ref(false)

  let initialized = false
  async function onInit() {
    if (initialized) {
      return
    }
    initialized = true
    await init(targetLocale.value)
    translation.task.pieceNormalQueue.onChange((cur) => {
      if (cur.length > 0) {
        isTranslating.value = true
      }
      else {
        isTranslating.value = false
      }
    })
  }

  useEventListener(document, 'visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      setTranslationMenuTargetLanguage(enabled.value, targetLocale.value)
    }
  })

  watch(enabled, async (newVal) => {
    await setTranslationMenuTargetLanguage(newVal, targetLocale.value)
  })

  watch(targetLocale, async (newVal) => {
    await setTranslationMenuTargetLanguage(enabled.value, newVal)
  })

  registerContentScriptRpcEvent('contextMenuClicked', async (e) => {
    if (e.menuItemId === 'native-mind-page-translate') {
      await onInit()
      enabled.value = toggleTranslation(!enabled.value)
    }
    else if (e.menuItemId === 'native-mind-selection-translate') {
      await onInit()
      const selection = window.getSelection()
      const commonAncestor = getCommonAncestorElement(selection)
      commonAncestor && translation.translateElement(commonAncestor)
    }
  })

  return {
    enabled,
    isTranslating,
    toggleTranslation: async (_enabled?: boolean) => {
      await onInit()
      enabled.value = toggleTranslation(_enabled)
      return enabled.value
    },
    setTargetLocale: (locale: LanguageCode) => {
      targetLocale.value = locale
    },
  }
}

export const useTranslator = createSharedComposable(_useTranslator)
