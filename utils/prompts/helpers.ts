import { UserContent } from 'ai'

import { nonNullable } from '../array'
import { Base64ImageData } from '../image'

export class UserPrompt {
  constructor(private _content: UserContent) { }

  static fromText(text: string) {
    return new UserPrompt(text)
  }

  static fromImages(images: Base64ImageData[]) {
    return new UserPrompt(images.map((image) => ({ type: 'image', image: image.data, mimeType: image.type })))
  }

  static fromTextAndImages(text: string, images: Base64ImageData[]) {
    return new UserPrompt([{ type: 'text', text }, ...images.map((image) => ({ type: 'image' as const, image: image.data, mimeType: image.type }))])
  }

  extractText() {
    return extractTextContent(this.content)
  }

  get content() {
    return this._content
  }
}

export interface Prompt {
  user: UserPrompt
  system?: string
}

export function definePrompt<Args extends unknown[]>(cb: (...args: Args) => PromiseLike<Prompt> | Prompt) {
  return cb
}

export function extractTextContent(userContent: UserContent): string {
  if (typeof userContent === 'string') {
    return userContent
  }
  else {
    const seq = userContent.map((item) => {
      if (item.type === 'text') {
        return item.text
      }
    })
    return seq.filter(nonNullable).join('\n')
  }
}
