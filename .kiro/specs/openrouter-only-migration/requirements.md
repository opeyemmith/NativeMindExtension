# Requirements Document

## Introduction

This feature involves migrating the NativeMind extension from supporting multiple AI providers (Ollama, WebLLM, and OpenRouter) to exclusively supporting OpenRouter as the sole AI provider. This migration will simplify the codebase, reduce bundle size, and focus the extension on cloud-based AI services through OpenRouter's unified API.

## Requirements

### Requirement 1

**User Story:** As a user, I want the extension to work exclusively with OpenRouter so that I have access to multiple AI models through a single, reliable cloud service.

#### Acceptance Criteria

1. WHEN the extension is installed THEN it SHALL only support OpenRouter as the AI provider
2. WHEN a user opens the extension THEN it SHALL not show options for Ollama or WebLLM
3. WHEN a user configures the extension THEN it SHALL only require OpenRouter API key and model selection
4. WHEN the extension makes AI requests THEN it SHALL only use OpenRouter's API endpoints

### Requirement 2

**User Story:** As a user, I want to configure my OpenRouter API key and select from available models so that I can use the AI features.

#### Acceptance Criteria

1. WHEN a user opens settings THEN the system SHALL display OpenRouter API key input field
2. WHEN a user enters a valid API key THEN the system SHALL fetch and display available models
3. WHEN a user selects a model THEN the system SHALL save the configuration for future use
4. IF the API key is invalid THEN the system SHALL display an appropriate error message
5. WHEN no API key is configured THEN the system SHALL prompt the user to configure it

### Requirement 3

**User Story:** As a user, I want all existing AI features to work seamlessly with OpenRouter so that I don't lose any functionality.

#### Acceptance Criteria

1. WHEN I use chat functionality THEN it SHALL work with the selected OpenRouter model
2. WHEN I use page summarization THEN it SHALL use OpenRouter for content analysis
3. WHEN I use translation features THEN it SHALL use OpenRouter for translation
4. WHEN I use quick actions THEN they SHALL execute using OpenRouter models
5. WHEN I add images to chat THEN they SHALL be processed by OpenRouter vision models (if supported)

### Requirement 4

**User Story:** As a developer, I want the codebase to be cleaned of all Ollama and WebLLM dependencies so that the extension is lighter and easier to maintain.

#### Acceptance Criteria

1. WHEN building the extension THEN it SHALL not include Ollama client libraries
2. WHEN building the extension THEN it SHALL not include WebLLM or Hugging Face transformers
3. WHEN building for Firefox THEN it SHALL not have WebLLM-related external dependencies
4. WHEN analyzing the bundle THEN it SHALL show significantly reduced size
5. WHEN reviewing the code THEN it SHALL not contain unused Ollama or WebLLM imports

### Requirement 5

**User Story:** As a user, I want the extension to handle OpenRouter API errors gracefully so that I understand what went wrong and how to fix it.

#### Acceptance Criteria

1. WHEN the API key is missing THEN the system SHALL display a clear setup message
2. WHEN the API key is invalid THEN the system SHALL show an authentication error
3. WHEN rate limits are exceeded THEN the system SHALL display rate limit information
4. WHEN the selected model is unavailable THEN the system SHALL suggest alternative models
5. WHEN network errors occur THEN the system SHALL provide retry options

### Requirement 6

**User Story:** As a user migrating from the previous version, I want my existing settings to be handled appropriately so that I have a smooth transition experience.

#### Acceptance Criteria

1. WHEN upgrading from a previous version THEN the system SHALL detect existing Ollama/WebLLM configurations
2. WHEN old configurations are detected THEN the system SHALL show a migration notice
3. WHEN migration is needed THEN the system SHALL guide the user to configure OpenRouter
4. WHEN migration is complete THEN the system SHALL remove old configuration data
5. IF the user had OpenRouter already configured THEN the system SHALL preserve those settings