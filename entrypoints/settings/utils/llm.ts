import type { InitProgressReport } from '@mlc-ai/web-llm'
import type { ProgressResponse } from 'ollama/browser'
import { browser } from 'wxt/browser'

import { readPortMessageIntoIterator, toAsyncIter } from '@/utils/async'
import { BackgroundAliveKeeper } from '@/utils/keepalive'
// import { WebLLMSupportedModel } from '@/utils/llm/web-llm' // Removed - no longer supporting WebLLM
import { settings2bRpc } from '@/utils/rpc'

// All Ollama and WebLLM LLM functions removed - no longer supporting local LLMs
// - deleteOllamaModel
// - pullOllamaModel  
// - initWebLLMEngine

// initCurrentModel removed - no longer needed for cloud providers
// Cloud providers like OpenRouter don't require local model initialization
