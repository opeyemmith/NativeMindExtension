import { SettingsScrollTarget } from '@/utils/scroll-targets'
import { getTabStore } from '@/utils/tab-store'

interface Options {
  scrollTarget?: SettingsScrollTarget
  downloadModel?: string
}

// all settings status operation should be done through this function instead of directly modifying the tabStore.showSetting.value
export async function showSettings(show: boolean | ((show: boolean) => boolean), options?: Options) {
  const tabStore = await getTabStore()
  const isShow = typeof show === 'function' ? show(tabStore.showSetting.value.show) : show
  const { scrollTarget } = options ?? {}
  const downloadModel = options?.downloadModel
  if (isShow) {
    tabStore.showContainer.value = true
  }
  tabStore.showSetting.value = {
    show: isShow,
    scrollTarget: scrollTarget,
    downloadModel,
  }
}
