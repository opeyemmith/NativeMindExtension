# Implementation Plan

- [x] 1. Clean up package dependencies and build configuration


  - Remove unused AI provider dependencies from package.json
  - Update build configuration to remove WebLLM externals
  - Update WXT config to remove Firefox-specific WebLLM exclusions
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 2. Simplify core LLM provider logic


  - [x] 2.1 Update models.ts to only support OpenRouter


    - Remove WebLLM imports and conditional logic
    - Simplify getModel() function to only handle OpenRouter provider
    - Remove model initialization complexity for local providers
    - _Requirements: 1.4, 4.5_

  - [x] 2.2 Clean up user configuration management


    - Remove endpoint type switching logic in user-config/index.ts
    - Ensure endpointType defaults to 'openrouter' only
    - Remove unused configuration options for Ollama/WebLLM
    - _Requirements: 2.1, 2.3_

- [x] 3. Update RPC background functions





  - [ ] 3.1 Remove Ollama and WebLLM RPC functions
    - Remove all commented Ollama functions from background-fns.ts
    - Remove all commented WebLLM functions from background-fns.ts


    - Clean up unused imports and type definitions
    - _Requirements: 4.5_

  - [x] 3.2 Simplify connection and model management functions





    - Update testConnection() to only test OpenRouter
    - Simplify getLocalModelList() to return OpenRouter models only
    - Update checkModelReady() to only handle OpenRouter
    - Update initCurrentModel() to only handle OpenRouter


    - _Requirements: 1.4, 2.2_





- [ ] 4. Update content script and main world injection
  - [ ] 4.1 Simplify content-main-world-fns.ts
    - Remove Ollama and WebLLM conditional logic in checkBackendAndModelReady()
    - Update function to only handle OpenRouter endpoint type


    - Remove unused WebLLM model cache checking
    - _Requirements: 1.4_






  - [ ] 4.2 Clean up main-world-injected scripts
    - Remove WebLLM and Chrome AI integration if not needed
    - Update LLM API integration to focus on OpenRouter
    - Remove unused utility functions for local providers


    - _Requirements: 4.5_

- [ ] 5. Update Pinia stores and state management
  - [x] 5.1 Remove or simplify Ollama status store


    - Remove useOllamaStatusStore or mark it as deprecated
    - Update any components that depend on Ollama store



    - Clean up unused store imports
    - _Requirements: 4.5_

  - [ ] 5.2 Ensure OpenRouter store is the primary model store


    - Update useOpenRouterStore to be the main model management store
    - Ensure proper initialization and error handling
    - Update store usage across components
    - _Requirements: 2.2, 2.4_

- [ ] 6. Update UI components and remove provider selection
  - [ ] 6.1 Remove Ollama-specific UI components
    - Remove Ollama tutorial and setup components
    - Remove Ollama model download and management UI
    - Remove Ollama connection status indicators
    - _Requirements: 1.2, 4.5_

  - [ ] 6.2 Remove WebLLM-specific UI components
    - Remove WebLLM downloader components
    - Remove WebLLM model selection and management UI
    - Remove WebLLM tutorial and setup components
    - _Requirements: 1.2, 4.5_

  - [ ] 6.3 Simplify provider selection and model configuration
    - Remove provider selection dropdown/options
    - Update model selector to only show OpenRouter models
    - Simplify configuration UI to focus on API key and model selection
    - _Requirements: 1.2, 2.1_

- [ ] 7. Update settings and onboarding flow
  - [ ] 7.1 Simplify onboarding to focus on OpenRouter
    - Update onboarding components to only show OpenRouter setup
    - Remove provider selection from onboarding flow
    - Add clear guidance for obtaining OpenRouter API key
    - _Requirements: 2.1, 2.2_

  - [ ] 7.2 Update settings pages for OpenRouter-only configuration
    - Remove provider-specific settings sections
    - Focus settings on OpenRouter API key and model configuration
    - Update settings validation to only check OpenRouter requirements
    - _Requirements: 2.1, 2.3_

- [ ] 8. Update error handling and user messaging
  - [ ] 8.1 Implement OpenRouter-specific error messages
    - Update error messages to be OpenRouter-specific
    - Remove references to Ollama connection errors
    - Add clear guidance for OpenRouter API issues
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 8.2 Add migration detection and user guidance
    - Detect existing Ollama/WebLLM configurations on startup
    - Show migration notice to users with old configurations
    - Provide clear guidance for transitioning to OpenRouter
    - Clean up old configuration data after migration
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Update constants and remove unused references
  - [ ] 9.1 Clean up constants.ts
    - Remove Ollama-related URLs and constants
    - Remove WebLLM-related constants
    - Keep only OpenRouter and general extension constants
    - _Requirements: 4.5_

  - [ ] 9.2 Update scroll targets and UI references
    - Remove Ollama and WebLLM scroll targets from scroll-targets.ts
    - Update any hardcoded references to local providers
    - Clean up unused imports across the codebase
    - _Requirements: 4.5_

- [ ] 10. Update model logos and branding
  - [ ] 10.1 Simplify model logo matching
    - Remove Ollama-specific logo matching in model-logos.ts
    - Keep relevant model logos for OpenRouter models (Llama, etc.)
    - Update logo matching logic to focus on model families
    - _Requirements: 4.5_

  - [ ] 10.2 Update predefined models list
    - Remove PREDEFINED_OLLAMA_MODELS from predefined-models.ts
    - Keep PREDEFINED_OPENROUTER_MODELS as the primary model list
    - Update any references to use OpenRouter models only
    - _Requirements: 1.1, 2.2_

- [ ] 11. Update documentation and README
  - [ ] 11.1 Update README.md to reflect OpenRouter-only support
    - Remove references to Ollama and WebLLM in feature descriptions
    - Update installation and setup instructions for OpenRouter
    - Update comparison table to reflect new architecture
    - Remove Ollama and WebLLM badges and links
    - _Requirements: 1.1, 1.2_

  - [ ] 11.2 Update troubleshooting and help documentation
    - Remove Ollama and WebLLM troubleshooting sections
    - Add comprehensive OpenRouter troubleshooting guide
    - Update error message documentation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Update test files and remove unused test utilities
  - [ ] 12.1 Clean up E2E test utilities
    - Remove Ollama API mocking from tests/e2e/utils.ts
    - Remove unused mock responses for Ollama
    - Update test utilities to focus on OpenRouter testing
    - _Requirements: 4.5_

  - [ ] 12.2 Update test configurations and mock data
    - Remove Ollama and WebLLM test configurations
    - Add comprehensive OpenRouter API mocking
    - Update test data to use OpenRouter models
    - _Requirements: 4.5_

- [ ] 13. Final validation and cleanup
  - [ ] 13.1 Perform comprehensive code review
    - Search for any remaining Ollama/WebLLM references
    - Verify all imports are used and necessary
    - Check for any dead code or unused functions
    - _Requirements: 4.5_

  - [ ] 13.2 Test all core functionality with OpenRouter
    - Test chat functionality with various OpenRouter models
    - Test page summarization and translation features
    - Test quick actions and context menu integration
    - Test image processing with vision-capable models
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 13.3 Validate bundle size reduction and performance
    - Build extension and verify significant bundle size reduction
    - Test extension startup time and memory usage
    - Verify Firefox build works without WebLLM externals
    - _Requirements: 4.3, 4.4_