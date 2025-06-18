import { Readability } from '@mozilla/readability'

export function parseDocument(doc: Document) {
  const clonedDoc = doc.cloneNode(true) as Document
  let article = new Readability(clonedDoc, {
    // debug: import.meta.env.DEV,
  }).parse()
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
