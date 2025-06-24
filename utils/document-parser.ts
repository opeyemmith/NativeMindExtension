import { Readability } from '@mozilla/readability'

import { translationTargetClass, translationTargetDividerClass, translationTargetInnerClass } from '@/entrypoints/content/utils/translator/utils/constant'

import { deepCloneDocumentWithShadowDOM } from './dom'

export async function parseDocument(doc: Document) {
  const clonedDoc = await deepCloneDocumentWithShadowDOM(
    doc,
    {
      excludeClasses: [translationTargetClass, translationTargetDividerClass, translationTargetInnerClass],
      excludeTags: ['nativemind-container', 'script', 'style', 'link', 'meta', 'svg', 'canvas', 'iframe', 'object', 'embed'],
    },
  )
  let article = new Readability(clonedDoc, {}).parse()
  if (!article) {
    article = {
      title: document.title,
      content: '',
      textContent: document.body.textContent,
      length: 0,
      byline: '',
      siteName: '',
      dir: 'ltr',
      excerpt: '',
      lang: document.documentElement.lang,
      publishedTime: '',
    }
  }
  const normalizedArticle = {
    ...article,
    textContent: article.textContent ?? document.body.textContent ?? '',
    title: article.title ?? document.title,
  }
  return normalizedArticle
}
