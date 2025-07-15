import { Base64String } from './common'

export type Base64ImageData = {
  data: Base64String // Base64 encoded string
  type: string // MIME type, e.g., 'image/png'
}
