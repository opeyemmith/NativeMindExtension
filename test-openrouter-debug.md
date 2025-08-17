# OpenRouter Debug Guide

## Current Issue: "Loading model failed"

### Debug Steps:

1. **Check Browser Console**
   - Open Developer Tools (F12)
   - Go to Console tab
   - Look for any error messages when trying to use OpenRouter

2. **Verify Configuration**
   - Go to Settings → Debug → Set Provider to "OpenRouter"
   - Go to Settings → General → Check OpenRouter Configuration:
     - Base URL: `https://openrouter.ai/api/v1`
     - API Key: Your OpenRouter API key

3. **Test API Key**
   - Get your API key from [OpenRouter](https://openrouter.ai/)
   - Make sure it's valid and has credits

4. **Check Model Selection**
   - Go to Settings → Chat
   - Make sure an OpenRouter model is selected (e.g., "openai/gpt-4o")

5. **Common Issues:**
   - **Invalid API Key**: Check if your OpenRouter API key is correct
   - **No Credits**: Make sure you have credits in your OpenRouter account
   - **Model Not Available**: Some models might not be available on your plan
   - **Network Issues**: Check if you can access openrouter.ai

### Quick Test:
1. Set Provider to "OpenRouter" in Debug settings
2. Enter your API key in General settings
3. Select a model like "openai/gpt-4o"
4. Try to send a simple message like "Hello"
5. Check console for any error messages

### Expected Behavior:
- No "Loading model failed" error
- Model should respond to your messages
- If there are API errors, they should be more specific than "Loading model failed"

### Next Steps:
If the issue persists, check the browser console for specific error messages and share them.
