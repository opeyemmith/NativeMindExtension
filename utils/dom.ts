export interface DeepCloneOptions {
  excludeClasses?: string[]
  excludeTags?: string[]
}

const shouldExclude = (element: Node, options: DeepCloneOptions) => {
  if (!(element instanceof HTMLElement)) return false
  const { excludeClasses = [], excludeTags = [] } = options
  if (excludeTags && excludeTags.includes(element.tagName.toLowerCase())) return true
  return excludeClasses.some((cls) => element.classList.contains(cls))
}

function deepCloneWithShadowDOM(node: Node, options: DeepCloneOptions = {}): Node {
  const hasShadowRoot = node instanceof HTMLElement && node.shadowRoot && node.shadowRoot instanceof ShadowRoot
  const isWebComponent = hasShadowRoot || (node instanceof HTMLElement && node.tagName.includes('-'))
  // use another tag name to avoid conflicts with the original web component
  const clone = isWebComponent ? document.createElement('div') : node.cloneNode(false)
  if (isWebComponent && clone instanceof HTMLElement) {
    clone.setAttribute('data-web-component-clone', 'true')
    clone.innerText = node.innerText
  }
  else {
    node.childNodes.forEach((child) => {
      if (shouldExclude(child, options)) return // Skip cloning this child if it has an excluded class or tag
      clone.appendChild(deepCloneWithShadowDOM(child))
    })
  }

  return clone
}

export async function deepCloneDocumentWithShadowDOM(doc: Document, options: DeepCloneOptions = {}): Promise<Document> {
  const clonedDoc = document.implementation.createHTMLDocument()
  for (const child of doc.head.childNodes) {
    if (shouldExclude(child, options)) continue
    const clonedChild = deepCloneWithShadowDOM(child, options)
    clonedDoc.head.appendChild(clonedChild)
  }
  for (const child of doc.body.childNodes) {
    if (shouldExclude(child, options)) continue
    const clonedChild = deepCloneWithShadowDOM(child, options)
    clonedDoc.body.appendChild(clonedChild)
  }
  return clonedDoc
}
