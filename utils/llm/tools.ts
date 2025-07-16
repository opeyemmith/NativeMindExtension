import { jsonSchema, Tool, tool, ToolSet } from 'ai'
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

export type ToolWithName = Tool & { name: string }

export function selectTools(...toolNames: (keyof typeof TOOLS | ToolWithName)[]) {
  const r = Object.fromEntries(toolNames.map((toolOrToolName) => {
    if (typeof toolOrToolName === 'string') {
      return [toolOrToolName, TOOLS[toolOrToolName]]
    }
    return [
      toolOrToolName.name,
      tool({
        description: toolOrToolName.description,
        parameters: jsonSchema(toolOrToolName.parameters),
      }),
    ]
  }))
  return r as ToolSet
}
