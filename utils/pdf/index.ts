import { extractText, getDocumentProxy as originalGetDocumentProxy, renderPageAsImage } from 'unpdf'

import { isTypedArray, TypedArray } from '@/types/common'

import { base64ToUint8Array } from '../base64'

type PDFDocumentProxy = Awaited<ReturnType<typeof originalGetDocumentProxy>>

type PDFFile = ArrayBuffer | Blob | File | TypedArray | PDFDocumentProxy | number[] | string

export async function getDocumentProxy(doc: PDFFile): Promise<PDFDocumentProxy> {
  if (Array.isArray(doc) || isTypedArray(doc) || doc instanceof ArrayBuffer) {
    return originalGetDocumentProxy(doc)
  }
  else if (typeof doc === 'string') {
    // we treat string as a base64 encoded PDF
    const uintArray = base64ToUint8Array(doc)
    return originalGetDocumentProxy(uintArray)
  }
  else if (doc instanceof Blob || doc instanceof File) {
    const arrayBuffer = await doc.arrayBuffer()
    return originalGetDocumentProxy(arrayBuffer)
  }
  else if ('_pdfInfo' in doc) {
    return doc
  }
  else {
    throw new Error('Unsupported PDF document type')
  }
}

export async function extractPdfText(pdfFile: PDFFile) {
  const proxy = await getDocumentProxy(pdfFile)
  const textContent = await extractText(proxy, { mergePages: true })
  return {
    textContent,
    pdfProxy: proxy,
  }
}

export async function getPdfPageCount(pdfFile: PDFFile): Promise<number> {
  const proxy = await getDocumentProxy(pdfFile)
  return proxy.numPages
}

export async function renderPdfPagesAsImages(pdfFile: PDFFile, options: { scale?: number, pageRange?: [number | undefined, number | undefined] } = {}) {
  const proxy = await getDocumentProxy(pdfFile)
  const pageCount = proxy.numPages
  const pageStart = options.pageRange?.[0] ? options.pageRange[0] : 0
  const pageEnd = options.pageRange?.[1] ? options.pageRange[1] : pageCount
  const scale = options.scale || 1
  const images = []
  for (let i = pageStart; i < pageEnd && i < pageCount; i++) {
    const image = await renderPageAsImage(proxy, i + 1, { scale })
    images.push({
      image: image,
      pageNumber: i,
    })
  }
  return {
    images,
    pdfProxy: proxy,
  }
}

export async function checkReadablePdf(pdfFile: PDFFile): Promise<boolean> {
  const proxy = await getDocumentProxy(pdfFile)
  const textContent = await extractText(proxy, { mergePages: true })
  const trimmedText = textContent.text.replace(/(\s|\t)+/g, ' ').replace(/\n+/g, '\n').trim()
  if (trimmedText.length === 0) {
    return false
  }
  if (trimmedText.length < 100) {
    // check for non-readable characters
    if (trimmedText.includes('\ufffd') || trimmedText.includes('\uFFFC')) {
      return false
    }
  }
  return true
}
