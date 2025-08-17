export interface OpenRouterModel {
  id: string
  name: string
  description: string
  pricing: {
    prompt: string
    completion: string
  }
  context_length: number
  architecture: {
    modality: string
    tokenizer: string
    instruct_type: string
  }
  top_provider: {
    max_completion_tokens: number
    is_moderated: boolean
  }
  per_request_limits: {
    prompt_tokens: string
    completion_tokens: string
  }
}

export async function getOpenRouterModels(apiKey: string): Promise<OpenRouterModel[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://nativemind.app',
      'X-Title': 'NativeMind',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch models: ${response.status} ${response.statusText}. ${errorText}`)
  }

  const data = await response.json()
  return data.data || []
}

// Cache for models to avoid repeated API calls
let modelsCache: {
  models: OpenRouterModel[]
  timestamp: number
  apiKey: string
} | null = null

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function getOpenRouterModelsWithCache(apiKey: string): Promise<OpenRouterModel[]> {
  const now = Date.now()

  // Return cached models if still valid and same API key
  if (modelsCache
    && modelsCache.apiKey === apiKey
    && (now - modelsCache.timestamp) < CACHE_DURATION) {
    return modelsCache.models
  }

  try {
    const models = await getOpenRouterModels(apiKey)

    // Update cache
    modelsCache = {
      models,
      timestamp: now,
      apiKey,
    }

    return models
  }
  catch (_error) {
    // If API fails but we have cached models, return them
    if (modelsCache && modelsCache.apiKey === apiKey) {
      // console.warn('OpenRouter API failed, using cached models:', error)
      return modelsCache.models
    }

    // Otherwise fall back to predefined models
    // console.warn('OpenRouter API failed, using predefined models:', error)
    return POPULAR_OPENROUTER_MODELS.map((id) => ({
      id,
      name: id.split('/').pop() || id,
      description: 'Popular model',
      pricing: { prompt: '0', completion: '0' },
      context_length: 8192,
      architecture: { modality: 'text', tokenizer: 'unknown', instruct_type: 'unknown' },
      top_provider: { max_completion_tokens: 4096, is_moderated: false },
      per_request_limits: { prompt_tokens: '0', completion_tokens: '0' },
    }))
  }
}

export function clearOpenRouterModelsCache(): void {
  modelsCache = null
}

export function searchOpenRouterModels(models: OpenRouterModel[], query: string): OpenRouterModel[] {
  if (!query.trim()) return models

  const searchTerms = query.toLowerCase().split(' ').filter(Boolean)

  return models.filter((model) => {
    const searchableText = [
      model.id,
      model.name,
      model.description || '',
      model.architecture.modality,
      model.architecture.instruct_type,
    ].join(' ').toLowerCase()

    return searchTerms.every((term) => searchableText.includes(term))
  })
}

export function sortOpenRouterModels(models: OpenRouterModel[]): OpenRouterModel[] {
  // Sort by popularity (predefined models first), then alphabetically
  return models.sort((a, b) => {
    const aIsPopular = POPULAR_OPENROUTER_MODELS.includes(a.id as never)
    const bIsPopular = POPULAR_OPENROUTER_MODELS.includes(b.id as never)

    if (aIsPopular && !bIsPopular) return -1
    if (!aIsPopular && bIsPopular) return 1

    // If both popular or both not popular, sort by name
    return a.name.localeCompare(b.name)
  })
}

export function categorizeOpenRouterModels(models: OpenRouterModel[]): Record<string, OpenRouterModel[]> {
  const categories: Record<string, OpenRouterModel[]> = {}

  models.forEach((model) => {
    const provider = model.id.split('/')[0] || 'other'
    const category = provider.charAt(0).toUpperCase() + provider.slice(1)

    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(model)
  })

  // Sort each category
  Object.keys(categories).forEach((category) => {
    categories[category] = sortOpenRouterModels(categories[category])
  })

  return categories
}

export const POPULAR_OPENROUTER_MODELS = [
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-sonnet',
  'anthropic/claude-3.5-haiku',
  'google/gemini-pro',
  'meta-llama/llama-3.1-8b-instruct',
  'meta-llama/llama-3.1-70b-instruct',
  'mistralai/mistral-7b-instruct',
  'mistralai/mistral-large-latest',
  'cohere/command-r',
  'deepseek-ai/deepseek-coder-33b-instruct',
  'qwen/qwen2.5-72b-instruct',
  'microsoft/phi-3.5-128k-instruct',
  '01-ai/yi-1.5-34b-chat',
  'perplexity/llama-3.1-8b-instruct',
  'perplexity/llama-3.1-70b-instruct',
] as const
