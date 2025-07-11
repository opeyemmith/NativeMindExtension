export type Base64String = string

export type Base64ImageData = {
  data: Base64String // Base64 encoded string
  type: string // MIME type, e.g., 'image/png'
}
