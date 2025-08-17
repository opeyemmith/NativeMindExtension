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
  errorToMessage: (data) => data.error.message,
})
