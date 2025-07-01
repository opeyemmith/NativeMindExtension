import { onScopeDispose } from 'vue'

import { OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS } from '@/utils/constants'
import { debounce } from '@/utils/debounce'
import { useGlobalI18n } from '@/utils/i18n'
import { getModelLogoSvg } from '@/utils/llm/model-logos'

import { showSettings } from '../settings'

function makeLogoElement(modelName: string) {
  const logo = document.createElement('div')
  logo.style.cssText = `background-color: white; border-radius: 9999px; display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px;`
  logo.innerHTML = getModelLogoSvg(modelName)
  const logoSvg = logo.querySelector('svg')
  if (logoSvg) {
    logoSvg.style.width = '12px'
    logoSvg.style.height = '12px'
  }
  return logo
}

function makeDownloadButton(modelName: string, text: string, additionalCss?: string) {
  const downloadButton = document.createElement('button')
  const logo = makeLogoElement(modelName)
  downloadButton.appendChild(logo)
  downloadButton.appendChild(document.createTextNode(text))
  downloadButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    background-color: #24B960;
    color: white;
    border: 1px;
    height: 28px;
    border-radius: 4px;
    text-decoration: none;
    box-shadow: 0px 0px 0px 1px #24B960, 0px 1px 2px 0px #00000066, 0px 0.75px 0px 0px #FFFFFF33 inset;
    ${additionalCss || ''}
`
  downloadButton.addEventListener('mouseenter', () => {
    downloadButton.style.backgroundColor = '#089641' // Darker shade of green
  })

  downloadButton.addEventListener('mouseleave', () => {
    downloadButton.style.backgroundColor = '#24B960' // Reset to original color
  })
  downloadButton.className = OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS
  downloadButton.addEventListener('click', async (ev) => {
    ev.stopImmediatePropagation()
    ev.preventDefault()
    showSettings(true, {
      scrollTarget: 'model-download-section',
      downloadModel: modelName,
    })
  })
  return downloadButton
}

export async function useInjectOllamaSearchPageDownloadButtons() {
  if (location.host !== 'ollama.com' || !location.pathname.startsWith('/search')) return

  const { t } = await useGlobalI18n()

  function mount() {
    let anchors = document.querySelectorAll('ul[role="list"] li a') as NodeListOf<HTMLAnchorElement>
    anchors = anchors ?? document.querySelectorAll('ul li a[href*="/library/"]') as NodeListOf<HTMLAnchorElement>
    anchors = anchors ?? document.querySelectorAll('a[href*="/library/"]') as NodeListOf<HTMLAnchorElement>

    const appendButtonTo = (el: HTMLElement, modelName: string) => {
      const downloadButton = makeDownloadButton(modelName, t('ollama.sites.add_to_nativemind'), 'margin-bottom: 4px;')
      el.appendChild(downloadButton)
    }

    if (anchors.length) {
      anchors.forEach((anchor) => {
        const h2 = anchor.querySelector('h2')
        const container = h2 ?? anchor
        appendButtonTo(container, anchor.href.split('/library/')[1].split('/')[0])
      })
    }
    // fallback for when the anchors are not found
    if (!document.querySelector(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)) {
      const titleSpans = document.querySelectorAll('[x-test-search-response-title]')
      if (titleSpans.length) {
        titleSpans.forEach((span) => {
          const modelName = span.textContent?.trim()
          if (!modelName) return
          const container = span.closest('h2') || span.closest('a') || span
          if (!container) return
          appendButtonTo(container as HTMLElement, modelName)
        })
      }
    }
  }

  const debounceMount = debounce(mount, 300)
  mount()
  const observer = new MutationObserver(() => {
    if (document.querySelector(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)) return
    debounceMount()
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
  onScopeDispose(() => {
    observer.disconnect()
    const buttons = document.querySelectorAll(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)
    buttons.forEach((button) => {
      button.remove()
    })
  })
}

export async function useInjectOllamaModelInfoPageDownloadButtons() {
  if (location.host !== 'ollama.com' || !location.pathname.startsWith('/library')) return
  const modelName = location.pathname.split('/library/')[1].split('/')[0]
  if (!modelName) return

  const { t } = await useGlobalI18n()
  const appendButtonTo = (el: HTMLElement, modelName: string) => {
    const downloadButton = makeDownloadButton(modelName, t('ollama.sites.add_to_nativemind'), 'margin-left: 8px;')
    el.appendChild(downloadButton)
  }

  function mount() {
    const anchors = document.querySelectorAll(`span > a:not([x-test-model-name])[href*="/library/${modelName || ''}"]`) as NodeListOf<HTMLAnchorElement>
    if (anchors.length) {
      anchors.forEach((anchor) => {
        const modelName = anchor.href.split('/library/')[1].split('/')[0]
        appendButtonTo(anchor, modelName)
      })
    }
    // fallback for when the anchors are not found
    if (!document.querySelector(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)) {
      const titleSpans = document.querySelectorAll('[x-test-model-name]')
      if (titleSpans.length) {
        titleSpans.forEach((span) => {
          const container = span.closest('div') || span.closest('span') || span as HTMLElement
          if (!container) return
          appendButtonTo(container, modelName)
        })
      }
    }
  }

  const debounceMount = debounce(mount, 300)
  mount()
  const observer = new MutationObserver(() => {
    if (document.querySelector(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)) return
    debounceMount()
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  })
  onScopeDispose(() => {
    observer.disconnect()
    const buttons = document.querySelectorAll(`.${OLLAMA_SITE_DOWNLOAD_BUTTON_CLASS}`)
    buttons.forEach((button) => {
      button.remove()
    })
  })
}

export async function useInjectOllamaDownloadButtons() {
  await Promise.all([
    useInjectOllamaSearchPageDownloadButtons(),
    useInjectOllamaModelInfoPageDownloadButtons(),
  ])
}
