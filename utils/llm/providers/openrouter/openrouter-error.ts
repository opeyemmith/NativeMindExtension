import { createJsonErrorResponseHandler } from '@ai-sdk/provider-utils'
import { z } from 'zod'

const openrouterErrorDataSchema = z.object({
  error: z.object({
    code: z.string().optional(),
    message: z.string(),
    type: z.string().optional(),
  }),
})

export type OpenRouterErrorData = z.infer<typeof openrouterErrorDataSchema>

export const openrouterFailedResponseHandler = createJsonErrorResponseHandler({
  errorSchema: openrouterErrorDataSchema,
  errorToMessage: (data) => {
    const message = data.error.message
    // Add additional context for rate limiting errors
    if (data.error.code === 'rate_limit_exceeded' || message.includes('rate limit') || message.includes('429')) {
      return `Rate limit exceeded: ${message}. Please wait a moment and try again, or consider upgrading your OpenRouter plan for higher limits.`
    }
    return message
  },
})
