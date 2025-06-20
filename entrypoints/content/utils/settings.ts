import { SettingsScrollTarget } from '@/utils/scroll-targets'
import { getTabStore } from '@/utils/tab-store'

export async function showSettings(show: boolean | ((show: boolean) => boolean), scrollTarget?: SettingsScrollTarget) {
  const tabStore = await getTabStore()
  const isShow = typeof show === 'function' ? show(tabStore.showSetting.value.show) : show
  if (isShow) {
    tabStore.showContainer.value = true
  }
  tabStore.showSetting.value = {
    show: isShow,
    scrollTarget: scrollTarget,
  }
}
