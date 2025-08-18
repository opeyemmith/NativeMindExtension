# Design Document

## Overview

This design outlines the migration of NativeMind extension from a multi-provider AI system (supporting Ollama, WebLLM, and OpenRouter) to an OpenRouter-only implementation. The migration will significantly simplify the codebase, reduce bundle size, and focus on providing a reliable cloud-based AI experience.

Based on the codebase analysis, OpenRouter integration is already well-established and functional. The primary work involves removing Ollama and WebLLM dependencies, cleaning up unused code, and ensuring all features work seamlessly with OpenRouter as the sole provider.

## Architecture

### Current State Analysis
The extension currently supports three AI providers:
- **Ollama**: Local AI server with model management
- **WebLLM**: Browser-based AI using WebAssembly
- **OpenRouter**: Cloud-based AI API (already well-implemented)

### Target Architecture
The simplified architecture will have:
- **Single Provider**: OpenRouter as the exclusive AI provider
- **Simplified Configuration**: Only API key and model selection needed
- **Reduced Bundle Size**: Removal of heavy dependencies (@mlc-ai/web-llm, ollama, @huggingface/transformers)
- **Cleaner Codebase**: Elimination of provider-specific logic and unused imports

### Key Architectural Changes
1. **Provider Layer**: Remove Ollama and WebLLM providers, keep only OpenRouter
2. **Configuration Layer**: Simplify user config to OpenRouter-only settings
3. **UI Layer**: Remove provider selection, model download, and local server management
4. **Build System**: Remove WebLLM external dependencies for Firefox builds

## Components and Interfaces

### 1. Configuration Management (`utils/user-config/index.ts`)
**Current State**: Supports multiple endpoint types with complex configuration
**Target State**: Simplified OpenRouter-only configuration

**Changes Required**:
- Set `endpointType` default to `'openrouter'` (already done)
- Remove endpoint type switching logic
- Keep existing OpenRouter configuration structure:
  - `baseUrl`: Default to `'https://openrouter.ai/api/v1'`
  - `apiKey`: User's OpenRouter API key
  - `model`: Selected model ID

### 2. Model Management (`utils/llm/models.ts`)
**Current State**: Complex provider switching with model initialization
**Target State**: OpenRouter-only model handling

**Changes Required**:
- Remove Ollama and WebLLM imports and logic
- Simplify `getModel()` function to only handle OpenRouter
- Remove model initialization complexity
- Keep existing OpenRouter provider creation

### 3. RPC Functions (`utils/rpc/background-fns.ts`)
**Current State**: Mixed provider support with conditional logic
**Target State**: OpenRouter-only RPC functions

**Changes Required**:
- Remove Ollama-specific functions (already commented out)
- Remove WebLLM-specific functions (already commented out)
- Keep OpenRouter functions:
  - `getOpenRouterModels()`
  - `testOpenRouterConnection()`
  - `clearOpenRouterModelsCache()`
- Simplify `testConnection()` to only test OpenRouter
- Simplify `getLocalModelList()` to return OpenRouter models

### 4. UI Components
**Current State**: Provider selection, model downloads, server management
**Target State**: Simple API key configuration and model selection

**Components to Remove/Modify**:
- Remove Ollama tutorial and setup components
- Remove WebLLM downloader components
- Remove provider selection UI
- Keep OpenRouter configuration UI
- Simplify onboarding to focus on OpenRouter setup

### 5. Store Management (`utils/pinia-store/`)
**Current State**: Separate stores for different providers
**Target State**: OpenRouter-only store management

**Changes Required**:
- Remove or simplify `useOllamaStatusStore` (marked for removal)
- Keep `useOpenRouterStore` as the primary model management store
- Update store initialization to assume OpenRouter

## Data Models

### OpenRouter Models
The existing OpenRouter model structure is well-designed and should be preserved:

```typescript
interface OpenRouterModel {
  id: string
  name: string
  description: string
  pricing: { prompt: string; completion: string }
  context_length: number
  architecture: { modality: string; tokenizer: string; instruct_type: string }
  top_provider: { max_completion_tokens: number; is_moderated: boolean }
  per_request_limits: { prompt_tokens: string; completion_tokens: string }
}
```

### Configuration Model
Simplified user configuration focusing on OpenRouter:

```typescript
interface UserConfig {
  llm: {
    endpointType: 'openrouter' // Fixed value
    baseUrl: string // OpenRouter API URL
    model: string | undefined // Selected model ID
    apiKey: string // User's API key
    // Keep existing OpenRouter-compatible settings
    numCtx: number
    enableNumCtx: boolean
    reasoning: boolean
    chatSystemPrompt: string
    summarizeSystemPrompt: string
  }
  // Other config sections remain unchanged
}
```

## Error Handling

### OpenRouter-Specific Error Handling
The existing OpenRouter error handling is comprehensive and should be enhanced:

1. **API Key Validation**
   - Clear error messages for missing/invalid API keys
   - Guidance on obtaining API keys

2. **Rate Limiting**
   - Proper handling of rate limit responses
   - User-friendly rate limit messages

3. **Model Availability**
   - Fallback to popular models when API fails
   - Clear messaging when selected model is unavailable

4. **Network Errors**
   - Retry mechanisms for transient failures
   - Offline state handling

### Migration Error Handling
1. **Configuration Migration**
   - Detect existing Ollama/WebLLM configurations
   - Show migration guidance to users
   - Preserve existing OpenRouter settings

2. **Graceful Degradation**
   - Handle cases where users had local models configured
   - Provide clear migration path to OpenRouter

## Testing Strategy

### Unit Tests
1. **Configuration Tests**
   - Test simplified user config initialization
   - Test OpenRouter-only provider creation
   - Test configuration migration logic

2. **Provider Tests**
   - Test OpenRouter API integration
   - Test error handling scenarios
   - Test model fetching and caching

3. **RPC Function Tests**
   - Test simplified background functions
   - Test OpenRouter connection testing
   - Test model list retrieval

### Integration Tests
1. **End-to-End Functionality**
   - Test chat functionality with OpenRouter
   - Test translation features
   - Test quick actions
   - Test image processing (if supported by selected models)

2. **Migration Testing**
   - Test upgrade scenarios from multi-provider versions
   - Test configuration preservation
   - Test user experience during migration

### Bundle Analysis
1. **Size Reduction Verification**
   - Compare bundle sizes before/after migration
   - Verify removal of heavy dependencies
   - Test Firefox build without WebLLM externals

2. **Performance Testing**
   - Test extension startup time
   - Test memory usage reduction
   - Test response times with OpenRouter

## Implementation Phases

### Phase 1: Dependency Cleanup
- Remove unused imports and dependencies
- Update package.json to remove Ollama and WebLLM packages
- Update build configuration to remove WebLLM externals

### Phase 2: Code Simplification
- Simplify provider logic in core modules
- Remove unused RPC functions
- Clean up configuration management

### Phase 3: UI Updates
- Remove provider selection interfaces
- Simplify onboarding flow
- Update settings to focus on OpenRouter

### Phase 4: Testing and Validation
- Comprehensive testing of all features
- Bundle size analysis
- Performance validation

### Phase 5: Migration Support
- Add migration detection and guidance
- Update documentation
- Prepare user communication

## Security Considerations

1. **API Key Management**
   - Secure storage of OpenRouter API keys
   - No logging of API keys in debug output
   - Clear API key validation

2. **Network Security**
   - HTTPS-only communication with OpenRouter
   - Proper header configuration for API requests
   - Request/response validation

3. **Content Security Policy**
   - Update CSP if needed after dependency removal
   - Ensure WebAssembly restrictions are appropriate

## Performance Optimizations

1. **Bundle Size Reduction**
   - Remove ~50MB+ of WebLLM dependencies
   - Remove Ollama client libraries
   - Simplified build process

2. **Runtime Performance**
   - Faster extension startup without heavy dependencies
   - Reduced memory footprint
   - Simplified provider initialization

3. **Caching Strategy**
   - Maintain existing OpenRouter model caching
   - Optimize cache invalidation
   - Reduce API calls through smart caching

## Backward Compatibility

### Configuration Migration
- Detect existing multi-provider configurations
- Preserve OpenRouter settings if already configured
- Guide users through migration process
- Clean up obsolete configuration keys

### Feature Preservation
- Ensure all existing features work with OpenRouter
- Maintain API compatibility for internal components
- Preserve user experience for core functionality

### Graceful Degradation
- Handle cases where users had local models
- Provide clear messaging about changes
- Offer guidance for transitioning workflows