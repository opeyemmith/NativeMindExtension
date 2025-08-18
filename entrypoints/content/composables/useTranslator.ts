import { createSharedComposable, useEventListener } from '@vueuse/core'
import { ref, watch } from 'vue'

import { useToast } from '@/composables/useToast'
import { getTranslatorEnv, handleTranslatorEnvUpdated, init, setTranslatorEnv, toggleTranslation, translation } from '@/entrypoints/content/utils/translator'
import { useI18n } from '@/utils/i18n'
import { LanguageCode } from '@/utils/language/detect'
import logger from '@/utils/logger'
import { useOllamaStatusStore } from '@/utils/pinia-store/store'
import { registerContentScriptRpcEvent } from '@/utils/rpc'
import { getCommonAncestorElement } from '@/utils/selection'
import { showSettings } from '@/utils/settings'
import { getUserConfig } from '@/utils/user-config'

import { setTranslationMenuTargetLanguage } from '../utils/context-menu'

async function _useTranslator() {
  // useToast/useI18n must be called before the first await
  const { locale } = useI18n()
  const toast = useToast()
  const enabled = ref(false)
  const isTranslating = ref(false)
  const userConfig = await getUserConfig()
  const targetLocale = userConfig.translation.targetLocale.toRef()
  const ollamaStatusStore = useOllamaStatusStore()
  setTranslationMenuTargetLanguage(enabled.value, targetLocale.value)
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

  let initialized = false
  async function onInit() {
    if (initialized) return
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

  watch(() => [enabled.value, targetLocale.value, locale.value] as const, async ([enabled, targetLanguage]) => {
    if (document.visibilityState === 'visible') {
      await setTranslationMenuTargetLanguage(enabled, targetLanguage)
    }
  })

  let isWaiting = false

  registerContentScriptRpcEvent('contextMenuClicked', async (e) => {
    if (isWaiting) return
    isWaiting = true
    try {
      if (!enabled.value) {
        // Only OpenRouter is supported now - simplified condition
        if (!(await ollamaStatusStore.updateConnectionStatus())) {
          toast('🤖 Unable to connect to AI. Please check your settings!', { duration: 2000 })
          showSettings({ scrollTarget: 'server-address-section' })
          return
        }
        else if ((await ollamaStatusStore.updateModelList()).length === 0) {
          toast('🔍 No AI model found. Please check your model selection!', { duration: 2000 })
          showSettings({ scrollTarget: 'model-download-section' })
          return
        }
      }
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
    }
    catch (error) {
      logger.error('Error handling context menu click', error)
    }
    finally {
      isWaiting = false
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
