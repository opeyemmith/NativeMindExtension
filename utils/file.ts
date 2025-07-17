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
