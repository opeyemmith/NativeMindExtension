# OpenRouter Connection Test Guide

## Current Issues:
1. "Failed to fetch" errors
2. Wrong error messages (still showing "Ollama connection")
3. CSS loading errors

## Debug Steps:

### 1. Check OpenRouter Configuration
- Go to Settings → Debug → Set Provider to "OpenRouter"
- Go to Settings → General → Check:
  - Base URL: `https://openrouter.ai/api/v1`
  - API Key: Your OpenRouter API key

### 2. Test API Key Manually
```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openai/gpt-4o",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

### 3. Check Browser Console
- Press F12 → Console
- Look for specific error messages
- Check Network tab for failed requests

### 4. Common Issues:
- **Invalid API Key**: Make sure your OpenRouter API key is correct
- **No Credits**: Check if you have credits in your OpenRouter account
- **CORS Issues**: The extension might have CORS restrictions
- **Network Issues**: Check if you can access openrouter.ai

### 5. Test Different Models
Try these models:
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`
- `meta-llama/llama-3.1-8b-instruct`

### 6. Check Extension Permissions
Make sure the extension has permission to access:
- `https://openrouter.ai/*`

## Expected Behavior:
- No "Failed to fetch" errors
- Proper error messages for OpenRouter
- Successful API calls to OpenRouter

## Next Steps:
If the issue persists, check the browser console for specific error messages and share them.
