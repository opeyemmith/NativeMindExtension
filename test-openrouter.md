# OpenRouter Integration Test Guide

This guide will help you test the OpenRouter integration in the NativeMind Extension.

## Prerequisites

1. **OpenRouter API Key**: Get one from [OpenRouter](https://openrouter.ai/)
2. **Extension Built**: Make sure the extension is built with the latest changes

## Testing Steps

### 1. Configure OpenRouter

1. Open the extension settings
2. Go to the **Debug** section
3. Set **Provider** to `OpenRouter`
4. Go to the **General** section
5. Verify that the OpenRouter configuration appears:
   - **Base URL**: Should default to `https://openrouter.ai/api/v1`
   - **API Key**: Enter your OpenRouter API key

### 2. Test Model Selection

1. Go to the **Chat** section
2. Click on the model selector
3. Verify that OpenRouter models appear in the dropdown:
   - GPT-4o
   - Claude 3.5 Sonnet
   - Gemini Pro
   - Llama 3.1 8B/70B
   - Mistral 7B/Large
   - And many more...

### 3. Test Chat Functionality

1. Select a model (e.g., `openai/gpt-4o-mini` for cost-effectiveness)
2. Open the side panel
3. Send a test message: "Hello, can you help me with a simple question?"
4. Verify that:
   - The response is generated
   - The response comes from the selected OpenRouter model
   - No errors occur

### 4. Test Different Models

Try different models to ensure they all work:
- **Fast & Cheap**: `openai/gpt-4o-mini`
- **High Quality**: `openai/gpt-4o`
- **Claude**: `anthropic/claude-3.5-haiku`
- **Local-like**: `meta-llama/llama-3.1-8b-instruct`

### 5. Test Error Handling

1. **Invalid API Key**: 
   - Enter an invalid API key
   - Try to send a message
   - Verify that an appropriate error is shown

2. **Network Issues**:
   - Disconnect from internet
   - Try to send a message
   - Verify that network error is handled gracefully

3. **Model Unavailable**:
   - Try a model that might be temporarily unavailable
   - Verify that the error is handled properly

## Expected Behavior

### ✅ Success Cases
- Models load correctly in the dropdown
- Chat responses are generated successfully
- API key is stored securely
- Base URL defaults correctly
- Model switching works seamlessly

### ❌ Error Cases
- Invalid API key shows clear error message
- Network issues are handled gracefully
- Model unavailability is communicated clearly
- Configuration errors are prevented

## Troubleshooting

### Common Issues

1. **"No models available"**
   - Check if API key is valid
   - Verify base URL is correct
   - Check OpenRouter service status

2. **"Model not found"**
   - Try a different model
   - Check if the model is available on OpenRouter
   - Verify model ID format

3. **"Network error"**
   - Check internet connection
   - Verify OpenRouter service status
   - Check if firewall is blocking requests

### Debug Information

To get more debug information:
1. Open browser developer tools
2. Go to Console tab
3. Look for any error messages related to OpenRouter
4. Check Network tab for API request/response details

## Performance Notes

- **First Request**: May take longer as connection is established
- **Model Switching**: Should be instant
- **Response Time**: Depends on the selected model and OpenRouter's routing
- **Cost**: Each request incurs charges based on OpenRouter's pricing

## Cost Optimization

- Use `openai/gpt-4o-mini` for testing (cheapest)
- Use `anthropic/claude-3.5-haiku` for good balance of cost/quality
- Monitor usage in your OpenRouter dashboard
- Set spending limits in OpenRouter account

## Next Steps

After successful testing:
1. Update documentation with any findings
2. Report any bugs or issues
3. Consider adding more models to the predefined list
4. Implement usage analytics if needed
