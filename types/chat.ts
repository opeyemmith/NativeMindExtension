import { PromiseOr } from './common'
import { Base64ImageData } from './image'
import { Base64PDFData } from './pdf'
import { TabInfo } from './tab'

export type ImageAttachment = {
  type: 'image'
  value: Base64ImageData & {
    id: string
    name: string
    size?: number
  }
}

export type PDFAttachment = {
  type: 'pdf'
  value: Base64PDFData & {
    id: string
    name: string
    size?: number
  }
}

export type TabAttachment = {
  type: 'tab'
  value: TabInfo
}

export type ContextAttachment = ImageAttachment | PDFAttachment | TabAttachment

export type AttachmentItem = {
  selectorMimeTypes: (`${string}/${string}` | '*')[]
  type: ContextAttachment['type']
  matchMimeType: (mimeType: string) => boolean
  validateFile: (context: { count: number }, file: File) => PromiseOr<boolean>
  convertFileToAttachment: (file: File) => PromiseOr<ContextAttachment>
}
