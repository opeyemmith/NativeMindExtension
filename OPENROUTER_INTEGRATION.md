# OpenRouter Integration for NativeMind Extension

This document describes the OpenRouter integration that has been added to the NativeMind Extension.

## Overview

OpenRouter support has been added to provide access to a wide variety of AI models through a single API. This allows users to choose from models like GPT-4, Claude, Gemini, and many others without needing separate API keys for each provider.

## Features

- **Multiple Model Support**: Access to 100+ models from various providers
- **Unified API**: Single API key for all models
- **Cost-Effective**: Competitive pricing with automatic model routing
- **Easy Integration**: Drop-in replacement for existing AI providers

## Setup

### 1. Get an OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Navigate to the API Keys section
4. Create a new API key

### 2. Configure the Extension

1. Open NativeMind Extension settings
2. Set **Endpoint Type** to `openrouter`
3. Set **Base URL** to `https://openrouter.ai/api/v1`
4. Enter your **API Key**
5. Select your preferred model from the dropdown

## Supported Models

The integration includes support for popular models such as:

### OpenAI Models
- `openai/gpt-4o` - Most advanced GPT model
- `openai/gpt-4o-mini` - Fast and efficient
- `openai/gpt-4-turbo` - Balanced performance
- `openai/gpt-3.5-turbo` - Cost-effective option

### Anthropic Models
- `anthropic/claude-3.5-sonnet` - Most capable Claude
- `anthropic/claude-3.5-haiku` - Fast and efficient
- `anthropic/claude-3-opus` - High-performance
- `anthropic/claude-3-sonnet` - Balanced performance

### Google Models
- `google/gemini-pro` - Advanced language model
- `google/gemini-flash-1.5` - Fast and efficient

### Meta Models
- `meta-llama/llama-3.1-8b-instruct` - Efficient 8B model
- `meta-llama/llama-3.1-70b-instruct` - Powerful 70B model
- `meta-llama/llama-3.2-1b-instruct` - Lightweight 1B model

### Mistral Models
- `mistralai/mistral-7b-instruct` - Efficient 7B model
- `mistralai/mistral-large-latest` - Most capable Mistral
- `mistralai/mixtral-8x7b-instruct` - Mixture of experts

### Other Popular Models
- `cohere/command-r` - RAG-optimized
- `deepseek-ai/deepseek-coder-33b-instruct` - Coding specialist
- `qwen/qwen2.5-72b-instruct` - Alibaba's powerful model
- `microsoft/phi-3.5-128k-instruct` - Long context support

## Architecture

The OpenRouter integration follows the same pattern as the existing Ollama and WebLLM providers:

```
utils/llm/providers/openrouter/
├── index.ts                    # Main exports
├── openrouter-provider.ts      # Provider factory
├── openrouter-chat-settings.ts # Model definitions and settings
├── openrouter-chat-language-model.ts # Chat implementation
├── openrouter-embedding-settings.ts # Embedding model definitions
└── openrouter-embedding-model.ts # Embedding implementation
```

## Key Components

### 1. Provider Factory (`openrouter-provider.ts`)
- Creates OpenRouter provider instances
- Handles API key and base URL configuration
- Sets up proper headers for OpenRouter API

### 2. Chat Language Model (`openrouter-chat-language-model.ts`)
- Implements the AI SDK LanguageModelV1 interface
- Handles both streaming and non-streaming responses
- Supports structured outputs and tool calls

### 3. Model Definitions (`openrouter-chat-settings.ts`)
- Comprehensive list of supported models
- Type-safe model IDs
- Settings interface for model configuration

### 4. Embedding Support
- Full embedding model support
- Compatible with OpenAI embedding models
- Supports text embedding operations

## Usage Examples

### Basic Chat
```typescript
const openrouter = createOpenRouter({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: 'your-api-key'
})

const model = openrouter('openai/gpt-4o', {
  temperature: 0.7,
  maxTokens: 1000
})

const response = await model.generate({
  prompt: 'Hello, how are you?'
})
```

### Streaming Response
```typescript
const stream = await model.stream({
  prompt: 'Tell me a story'
})

for await (const part of stream) {
  if (part.type === 'text-delta') {
    console.log(part.textDelta)
  }
}
```

## Configuration

The integration supports the following settings:

- **Base URL**: OpenRouter API endpoint (default: `https://openrouter.ai/api/v1`)
- **API Key**: Your OpenRouter API key
- **Model**: Selected model from the available options
- **Temperature**: Controls randomness (0.0 to 2.0)
- **Max Tokens**: Maximum response length
- **Top P**: Nucleus sampling parameter
- **Frequency Penalty**: Reduces repetition
- **Presence Penalty**: Encourages new topics

## Error Handling

The integration includes comprehensive error handling:

- **API Key Validation**: Checks for valid API key
- **Network Errors**: Handles connection issues
- **Rate Limiting**: Respects OpenRouter rate limits
- **Model Availability**: Handles model-specific errors

## Privacy Considerations

- **Data Processing**: OpenRouter processes requests according to their privacy policy
- **Logging**: OpenRouter may log requests for service improvement
- **Third-Party Models**: Each model provider has their own privacy practices
- **No Local Processing**: Unlike Ollama, all processing happens on OpenRouter servers

## Cost Management

OpenRouter provides transparent pricing:

- **Per-Token Pricing**: Pay only for tokens used
- **Model-Specific Rates**: Different models have different costs
- **Usage Tracking**: Monitor usage through OpenRouter dashboard
- **Budget Controls**: Set spending limits in OpenRouter account

## Troubleshooting

### Common Issues

1. **Invalid API Key**
   - Verify your API key is correct
   - Check if the key has sufficient credits

2. **Model Not Available**
   - Some models may be temporarily unavailable
   - Try a different model or check OpenRouter status

3. **Rate Limiting**
   - OpenRouter has rate limits per account
   - Consider upgrading your plan for higher limits

4. **Network Issues**
   - Check your internet connection
   - Verify OpenRouter service status

### Getting Help

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Discord](https://discord.gg/openrouter)
- [NativeMind Extension Issues](https://github.com/NativeMindBrowser/NativeMindExtension/issues)

## Future Enhancements

Potential improvements for the OpenRouter integration:

1. **Model Discovery**: Dynamic model list fetching
2. **Usage Analytics**: Built-in usage tracking
3. **Cost Optimization**: Automatic model selection based on cost
4. **Batch Processing**: Support for multiple concurrent requests
5. **Custom Models**: Support for fine-tuned models

## Contributing

To contribute to the OpenRouter integration:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This integration is part of the NativeMind Extension and follows the same AGPL-3.0 license.
