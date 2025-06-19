import { browser } from 'wxt/browser'

import logger from '@/utils/logger'

import { Tab } from './tab'

const log = logger.child('search')

interface SearchByGoogleOptions {
  resultNum?: number
  ignoreLinks?: string[]
  abortSignal?: AbortSignal
}

async function _searchByGoogle(query: string, options?: SearchByGoogleOptions) {
  const { abortSignal, ignoreLinks, resultNum = 30 } = options || {}
  await using tab = new Tab()
  await tab.openUrl(`https://www.google.com/search?q=${query}&num=${resultNum}`)
  abortSignal?.addEventListener('abort', () => {
    tab.dispose()
  })
  const tabInfo = await tab.getInfo()
  if (isValidationPage(tabInfo.url ?? '')) {
    log.debug('isValidationPage', tabInfo?.url)
    await tab.setActive(true)
    return []
  }
  const result = await tab.executeScript({
    func: () => {
      const blocks = [...document.querySelectorAll('[jscontroller] [data-snc]')]
      const result = blocks
        .map((block) => {
          const link = block.querySelector('a[jsname]') as HTMLAnchorElement | null
          const h = link?.querySelector('h3,h2,h1') as HTMLHeadingElement | null
          const title = h?.textContent
          const url = link?.href
          const descriptionDiv = block.querySelector('div[data-snf]') as HTMLDivElement | null
          const description = descriptionDiv?.textContent
          return { url, title, description }
        })
        .filter((m) => m.url) as { url: string, title?: string, description?: string }[]
      return result
    },
  })
  const rawLinks = result[0].result
  log.debug('search progress: links from google', rawLinks)
  if (!rawLinks) {
    logger.error('No links found')
    return []
  }
  const links = ignoreLinks?.length ? rawLinks.filter((link) => ignoreLinks?.every((ignoreLink) => !link.url?.includes(ignoreLink))) : rawLinks
  return links
}

interface ScrapePagesOptions {
  onProgress?: (prg: SearchingMessage) => void
  resultLimit?: number
  abortSignal?: AbortSignal
}

async function checkHtmlResponse(link: string) {
  try {
    const response = await fetch(link, { method: 'HEAD' })
    if (response.ok && response.headers.get('content-type')?.includes('text/html')) {
      return true
    }
  }
  catch (error) {
    logger.error('Failed to check HTML response for link:', link, error)
    return true // If there's an error, we assume it's an HTML page
  }
  return false
}

async function scrapePages(links: ({ url: string, title?: string, description?: string })[], options: ScrapePagesOptions) {
  const { onProgress, resultLimit = 5, abortSignal } = options
  await using tab = new Tab()
  const limit = Math.min(links.length, resultLimit)
  log.debug('search progress: scrapePages', links.length, limit)
  const linksWithContent = []
  while (linksWithContent.length < limit && links.length > 0) {
    if (!await tab.exists().catch(() => false)) break
    const idx = linksWithContent.length
    const link = links.shift()!
    if (abortSignal?.aborted) {
      log.debug('aborted')
      break
    }
    try {
      log.debug('search progress: start', idx, limit, link.url)
      if (!(await tab.exists())) {
        log.debug('tab is closed, skipping search progress')
        break
      }
      onProgress?.({
        type: 'page-start',
        title: link.title ?? '',
        url: link.url,
      })
      const isHtmlPage = await checkHtmlResponse(link.url)
      if (!isHtmlPage) {
        log.debug('search progress: not an HTML page, skipping', link.url)
        onProgress?.({
          type: 'page-error',
          title: link.title ?? '',
          url: link.url,
          error: 'Not an HTML page',
        })
        continue
      }
      await tab.openUrl(link.url, { active: false })
      const tabInfo = await tab.getInfo()
      const content = await tab.executeScript({
        func: () => {
          return document.body.innerText
        },
      })
      log.debug('search progress: end', idx, limit, tabInfo.url, tabInfo.title, link.url, content)
      const textContent = content[0].result ?? ''
      linksWithContent.push({
        ...link,
        textContent,
      })
      onProgress?.({
        type: 'page-finished',
        title: link.title ?? '',
        url: link.url,
      })
    }
    catch (error) {
      onProgress?.({
        type: 'page-error',
        title: link.title ?? '',
        url: link.url,
        error: String(error),
      })
      logger.error('search progress: Failed to load tab', error)
      continue
    }
  }

  log.debug('search progress: linksWithContent', linksWithContent)
  return linksWithContent
}

export type SearchingMessage =
  | {
    type: 'links'
    links: {
      url: string
      title: string
      description: string
      textContent?: string
    }[]
  }
  | {
    type: 'progress'
    currentPage: number
    totalPages: number
    currentUrl: string
    title: string
  }
  | {
    type: 'need-interaction'
    interactionType: 'captcha' | 'human-verification'
    currentUrl: string
  }
  | {
    type: 'query-start'
    query: string
  }
  | {
    type: 'query-finished'
    query: string
  } | {
    type: 'page-start'
    title: string
    url: string
  } | {
    type: 'page-finished'
    title: string
    url: string
  } | {
    type: 'page-error'
    title: string
    url: string
    error: string
  } | {
    type: 'page-aborted'
    title: string
    url: string
  }

export function searchOnline(queryList: string[], { resultLimit, engine }: { resultLimit?: number, engine: 'google' } = { engine: 'google' }) {
  const portName = `searchByGoogle-${Math.random().toString(36).substring(2, 15)}`
  const abortController = new AbortController()
  const query = queryList.join(', ')
  browser.runtime.onConnect.addListener(async function listener(port) {
    port.onDisconnect.addListener(() => {
      log.debug('[searchByGoogle] port disconnected')
      abortController.abort()
    })
    browser.runtime.onConnect.removeListener(listener)
    if (port.name === portName) {
      port.postMessage({ type: 'query-start', query })
      let links
      if (engine === 'google') {
        links = await _searchByGoogle(query, {
          abortSignal: abortController.signal,
        })
      }
      else {
        throw new Error(`Unsupported search engine: ${engine}`)
      }
      const linksWithContent = await scrapePages(links, {
        onProgress: (prg: SearchingMessage) => {
          port.postMessage(prg)
        },
        resultLimit,
        abortSignal: abortController.signal,
      })
      port.postMessage({ type: 'query-finished', query })
      port.postMessage({ type: 'links', links: linksWithContent })
      port.disconnect()
    }
  })
  return { portName }
}

function isValidationPage(url: string) {
  return url.includes('google.com/sorry')
}
