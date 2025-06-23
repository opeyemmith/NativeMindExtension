import { version } from '../package.json'

export const VERSION = version.split('-')[0]

export const OLLAMA_TUTORIAL_URL = 'https://nativemind.app/blog/tutorial/ollama-setup'
export const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download'
export const OLLAMA_HOMEPAGE_URL = 'https://ollama.com'
export const NATIVEMIND_HOMEPAGE_URL = 'https://nativemind.app'
export const FONT_FACE_CSS = 'content2'

export const INVALID_URLS = [
  /^https:\/\/chromewebstore.google.com/,
  /^https:\/\/chrome.google.com\/webstore\//,
  /^(?!https?:\/\/).+/,
]
