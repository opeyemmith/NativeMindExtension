# OpenRouter Debug Guide

## Current Issue:
"Failed to fetch" error when making API calls to OpenRouter

## Debug Steps:

### 1. Check API Key Configuration
- Verify the API key is correctly set in Settings → General
- Make sure there are no extra spaces or characters
- Check if the API key is valid by testing it manually

### 2. Test API Key Manually
```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -H "HTTP-Referer: https://nativemind.app" \
  -H "X-Title: NativeMind" \
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
- Look for CORS errors

### 4. Common Issues:
- **Invalid API Key**: Check if the API key is correct
- **No Credits**: Verify you have credits in your OpenRouter account
- **CORS Issues**: The extension might have CORS restrictions
- **Network Issues**: Check if you can access openrouter.ai
- **Request Format**: Verify the request body format

### 5. Debug the Request
Add console.log statements to see what's being sent:

```javascript
// In openrouter-chat-language-model.ts
console.log('OpenRouter Request:', {
  url: `${this.config.baseURL}/chat/completions`,
  headers: this.config.headers(),
  body: args
})
```

### 6. Check Extension Permissions
Make sure the extension has permission to access:
- `https://openrouter.ai/*`

### 7. Test Different Models
Try these models:
- `openai/gpt-4o`
- `anthropic/claude-3.5-sonnet`
- `meta-llama/llama-3.1-8b-instruct`

## Expected Behavior:
- No "Failed to fetch" errors
- Successful API calls to OpenRouter
- Proper response handling

## Next Steps:
If the issue persists, check the browser console for specific error messages and share them.
