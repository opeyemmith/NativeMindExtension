import { tool } from 'ai'
import { string, z } from 'zod'

const TOOLS = {
  translateParagraphs: tool({
    description: 'Translate the text into another language.',
    parameters: z.object({
      translation: z.array(string()),
    }),
  }),
}

export type ToolName = keyof typeof TOOLS

export function selectTools(...toolNames: (keyof typeof TOOLS)[]) {
  return Object.fromEntries(toolNames.map((name) => [name, TOOLS[name]]))
}
