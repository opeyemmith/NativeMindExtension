import { PromiseOr } from '@/types/common'

export type FileOrFileGetter<F extends File = File> = F | FileGetter

export class FileGetter<F extends File = File> {
  private cachedFile?: F

  static fromFile(file: File) {
    return new FileGetter(() => file, file.name, file.type)
  }

  constructor(private getFile: () => PromiseOr<F>, public name: string, public readonly mimeType: string) { }

  async file() {
    if (this.cachedFile) return this.cachedFile
    this.cachedFile = await this.getFile()
    return this.cachedFile
  }
}

export class PdfTextFile extends File {
  constructor(fileName: string, texts: string[], public pageCount: number, public source?: string | number) {
    const content = JSON.stringify({ texts, pageCount })
    super([content], fileName, { type: 'application/x-pdf-text' })
  }

  async textContent() {
    const text = await this.text()
    return JSON.parse(text).texts as string[]
  }
}
