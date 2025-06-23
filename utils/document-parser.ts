import { Readability } from '@mozilla/readability'

import { translationTargetClass, translationTargetDividerClass, translationTargetInnerClass } from '@/entrypoints/content/utils/translator/utils/constant'

function cleanupDocument(doc: Document) {
  const elements = doc.querySelectorAll(`.${translationTargetClass}, .${translationTargetDividerClass}, .${translationTargetInnerClass}`)
  elements.forEach((el) => el.remove())
  return doc
}

export function parseDocument(doc: Document) {
  const clonedDoc = cleanupDocument(doc.cloneNode(true) as Document)
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
