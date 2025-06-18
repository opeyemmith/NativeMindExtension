import { getUserConfig } from '../user-config'
import { definePrompt } from './helpers'

export interface Page {
  title: string
  url: string
  textContent?: string | null
}

export const chatWithPageContent = definePrompt(async (question: string, pages: Page[], onlineInfo: Page[] = []) => {
  const userConfig = await getUserConfig()
  const system = userConfig.llm.chatSystemPrompt.get()

  const searchResults = onlineInfo.length
    ? `<search_results>
${onlineInfo
  .map((page, idx) => {
    return `<search_result id="${idx + 1}">
Title: ${page.title ?? ''} | URL: ${page.url ?? ''}
${page.textContent ?? ''}
</search_result>
`
  })
  .join('\n')}
</search_results>`
    : ''

  const tabContext = `<tabs_context>
${pages
  .map((page, _idx) => {
    return `<tab>
Title: ${page.title ?? ''} | URL: ${page.url ?? ''}
${page.textContent ?? ''}
</tab>
`
  })
  .join('\n')}
</tabs_context>`

  const user = `
${tabContext}
${searchResults}

Question: ${question}`
  return { user, system }
})

export const summarizeWithPageContent = definePrompt(async (page: Page, question: string) => {
  const userConfig = await getUserConfig()
  const system = userConfig.llm.summarizeSystemPrompt.get()

  const user = `<tab_context>
Title: ${page.title ?? ''} | URL: ${page.url ?? ''}
${page.textContent ?? ''}
</tab_context>

Question: ${question}`
  return { user, system }
})

export const nextStep = definePrompt(async (messages: { role: 'user' | 'assistant' | string, content: string }[], pages: Page[]) => {
  const system = `You are a helpful assistant. Based on the conversation below and the current web page content, suggest the next step to take. You can suggest one of the following options:

1. search_online: ONLY if user requests the latest information or news that you don't already know. If you choose this option, you must also provide a list of search keywords.
   - All keywords will be combined into a single search, so follow search best practices
   - Each item should be a single keyword or very short phrase (1-3 words maximum)
   - Provide 2-5 keywords maximum
   - Keywords should be specific and relevant to the user's question
   - Consider the current page content to find complementary information
   - Do not include explanations, just the keywords

2. chat: Continue the conversation with the user if you have enough information from the current page content to answer their question.

Example response for search_online:
{"action":"search_online","queryKeywords":["climate news","paris agreement","emissions data"]}

Example response for chat:
{"action":"chat"}
`

  const tabContext
    = pages.length > 0
      ? `<tabs_context>
Note: Each tab content shows only the first 1000 characters. Consider whether the visible content suggests the full page would contain sufficient information to answer the user's question.

${pages
  .map((page) => {
    const text = page.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const length = text?.length ?? 0
    const truncatedText = length > 1000 ? text.slice(0, 1000) + '...[content truncated]' : text
    return `<tab>
Title: ${page.title ?? ''} | URL: ${page.url ?? ''}
${truncatedText}
</tab>`
  })
  .join('\n')}
</tabs_context>`
      : ''

  const user = `${tabContext}

<conversation>
  ${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}
</conversation>
`
  return { system, user }
})

export const generateSearchKeywords = definePrompt(async (messages: { role: 'user' | 'assistant' | string, content: string }[], pages: Page[]) => {
  const system = `You are a helpful assistant specialized in generating effective search keywords. Generate 2-5 search keywords for the user's question that would retrieve the most relevant information.

Each keyword should:
- Be a single keyword or very short phrase (1-3 words maximum)
- Be specific and relevant to the question
- Follow search best practices
- Represent different aspects of the query
- Consider the context of the current web pages to find related or complementary information

All keywords will be combined into a single search, so they should work well together.
Return only the keywords in a JSON array without any explanations.`

  const tabContext
    = pages.length > 0
      ? `<tabs_context>
${pages
  .map((page) => {
    const text = page.textContent?.replace(/\s+/g, ' ').trim() ?? ''
    const length = text?.length ?? 0
    const truncatedText = length > 1000 ? text.slice(0, 1000) + '...[content truncated]' : text
    return `<tab>
Title: ${page.title ?? ''} | URL: ${page.url ?? ''}
${truncatedText}
</tab>`
  })
  .join('\n')}
</tabs_context>\n`
      : ''

  const conversationContext = `<conversation>
${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}
</conversation>`

  const user = `${tabContext}${conversationContext}`

  return { system, user }
})

export const translateTextList = definePrompt(async (textList: string[], targetLanguage: string) => {
  const userConfig = await getUserConfig()
  const rawSystem = userConfig.translation.systemPrompt.get()
  const system = rawSystem.replace(/\{\{LANGUAGE\}\}/g, targetLanguage)
  const user = JSON.stringify(textList, null, 2).replace(/,\n/g, ',\n\n')
  return { system, user }
})

export const writingToolRewrite = definePrompt(async (text: string) => {
  const userConfig = await getUserConfig()
  const system = userConfig.writingTools.rewrite.systemPrompt.get()
  const user = text

  return { system, user }
})

export const writingToolProofread = definePrompt(async (text: string) => {
  const userConfig = await getUserConfig()
  const system = userConfig.writingTools.proofread.systemPrompt.get()
  const user = text

  return { system, user }
})

export const writingToolList = definePrompt(async (text: string) => {
  const userConfig = await getUserConfig()
  const system = userConfig.writingTools.list.systemPrompt.get()
  const user = text

  return { system, user }
})

export const writingToolSparkle = definePrompt(async (text: string) => {
  const userConfig = await getUserConfig()
  const system = userConfig.writingTools.sparkle.systemPrompt.get()
  const user = text

  return { system, user }
})

// TODO: This is a placeholder for the Chrome AI summarizer prompt.
export const chromeAISummarizer = definePrompt(async (input: string) => {
  const system = `You are an AI assistant for the browser extension, helping users understand and interact with web content across multiple tabs and search results.

When referencing information in your response:
- Create a brief reference using the source title in markdown link format.
- For titles that are very long, use a shortened version that remains identifiable.

Always respond in the same language as the user's most recent question. Match their language style and level of formality.

Your responses should be:
- Accurate and directly based on the provided content
- Concise and focused on answering the user's specific question
- Well-formatted using markdown for readability
- Clear about which source information comes from by using proper citations
`
  return { system, user: input.trim() }
})
