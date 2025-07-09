import { Marked } from 'marked'

export function getMarkedInstance() {
  const marked = new Marked({ async: true })
  return marked
}
