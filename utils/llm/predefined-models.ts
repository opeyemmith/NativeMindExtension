// Ollama models removed - migrated to OpenRouter-only architecture

export type PredefinedOpenRouterModel = {
  name: string
  id: string
  description?: string
  pricing?: {
    prompt: string
    completion: string
  }
  contextLength?: number
}

export const PREDEFINED_OPENROUTER_MODELS: PredefinedOpenRouterModel[] = [
  {
    name: 'GPT-4o',
    id: 'openai/gpt-4o',
    description: 'OpenAI\'s most advanced model',
    pricing: { prompt: '$0.0025', completion: '$0.01' },
    contextLength: 128000,
  },
  {
    name: 'GPT-4o Mini',
    id: 'openai/gpt-4o-mini',
    description: 'Fast and efficient GPT-4 model',
    pricing: { prompt: '$0.00015', completion: '$0.0006' },
    contextLength: 128000,
  },
  {
    name: 'Claude 3.5 Sonnet',
    id: 'anthropic/claude-3.5-sonnet',
    description: 'Anthropic\'s most capable model',
    pricing: { prompt: '$0.003', completion: '$0.015' },
    contextLength: 200000,
  },
  {
    name: 'Claude 3.5 Haiku',
    id: 'anthropic/claude-3.5-haiku',
    description: 'Fast and cost-effective Claude model',
    pricing: { prompt: '$0.00025', completion: '$0.00125' },
    contextLength: 200000,
  },
  {
    name: 'Gemini Pro',
    id: 'google/gemini-pro',
    description: 'Google\'s advanced language model',
    pricing: { prompt: '$0.0005', completion: '$0.0015' },
    contextLength: 1000000,
  },
  {
    name: 'Llama 3.1 8B',
    id: 'meta-llama/llama-3.1-8b-instruct',
    description: 'Meta\'s efficient 8B parameter model',
    pricing: { prompt: '$0.0002', completion: '$0.0002' },
    contextLength: 8192,
  },
  {
    name: 'Llama 3.1 70B',
    id: 'meta-llama/llama-3.1-70b-instruct',
    description: 'Meta\'s powerful 70B parameter model',
    pricing: { prompt: '$0.0007', completion: '$0.0008' },
    contextLength: 8192,
  },
  {
    name: 'Mistral 7B',
    id: 'mistralai/mistral-7b-instruct',
    description: 'Mistral\'s efficient 7B parameter model',
    pricing: { prompt: '$0.00014', completion: '$0.00042' },
    contextLength: 32768,
  },
  {
    name: 'Mistral Large',
    id: 'mistralai/mistral-large-latest',
    description: 'Mistral\'s most capable model',
    pricing: { prompt: '$0.0007', completion: '$0.0028' },
    contextLength: 32768,
  },
  {
    name: 'Command R',
    id: 'cohere/command-r',
    description: 'Cohere\'s efficient RAG-optimized model',
    pricing: { prompt: '$0.0005', completion: '$0.0015' },
    contextLength: 128000,
  },
  {
    name: 'DeepSeek Coder 33B',
    id: 'deepseek-ai/deepseek-coder-33b-instruct',
    description: 'Specialized for coding tasks',
    pricing: { prompt: '$0.0007', completion: '$0.0014' },
    contextLength: 16384,
  },
  {
    name: 'Qwen 2.5 72B',
    id: 'qwen/qwen2.5-72b-instruct',
    description: 'Alibaba\'s powerful 72B parameter model',
    pricing: { prompt: '$0.0006', completion: '$0.0012' },
    contextLength: 32768,
  },
  {
    name: 'Phi 3.5 128K',
    id: 'microsoft/phi-3.5-128k-instruct',
    description: 'Microsoft\'s efficient model with long context',
    pricing: { prompt: '$0.0003', completion: '$0.0015' },
    contextLength: 128000,
  },
  {
    name: 'Yi 1.5 34B',
    id: '01-ai/yi-1.5-34b-chat',
    description: '01.AI\'s powerful 34B parameter model',
    pricing: { prompt: '$0.0006', completion: '$0.0012' },
    contextLength: 4096,
  },
  {
    name: 'Perplexity Llama 3.1 8B',
    id: 'perplexity/llama-3.1-8b-instruct',
    description: 'Perplexity\'s optimized Llama 3.1 8B',
    pricing: { prompt: '$0.0002', completion: '$0.0002' },
    contextLength: 8192,
  },
  {
    name: 'Perplexity Llama 3.1 70B',
    id: 'perplexity/llama-3.1-70b-instruct',
    description: 'Perplexity\'s optimized Llama 3.1 70B',
    pricing: { prompt: '$0.0007', completion: '$0.0008' },
    contextLength: 8192,
  },
]
