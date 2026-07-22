/**
 * Read every open contentEditable text box on the slide canvas and
 * return a map of elementId → latest HTML. Used before Present mode.
 */
export function collectOpenTextEditorHtml() {
  const result = {}
  if (typeof document === 'undefined') return result
  try {
    const nodes = document.querySelectorAll('[data-slide-text-editor="true"][data-element-id]')
    nodes.forEach((node) => {
      const id = node.getAttribute('data-element-id')
      if (id) result[id] = node.innerHTML
    })
  } catch {
    // ignore
  }
  return result
}

/** Merge open contentEditable HTML into the slides array (immutable). */
export function applyTextEditorFlush(list, htmlById) {
  const slides = Array.isArray(list) ? list : []
  if (!htmlById || Object.keys(htmlById).length === 0) return slides
  return slides.map((slide) => {
    let changed = false
    const elements = (Array.isArray(slide?.elements) ? slide.elements : []).map((el) => {
      if (htmlById[el.id] != null && htmlById[el.id] !== el.text) {
        changed = true
        return { ...el, text: htmlById[el.id] }
      }
      return el
    })
    return changed ? { ...slide, elements } : slide
  })
}

/** Shallow-safe clone — never JSON.stringify multi-MB image decks. */
export function deepCloneSlides(list) {
  const slides = Array.isArray(list) ? list : []
  return slides.map((s) => ({
    ...s,
    elements: Array.isArray(s?.elements)
      ? s.elements.map((el) => ({
          ...el,
          children: Array.isArray(el.children) ? el.children.map((c) => ({ ...c })) : el.children
        }))
      : []
  }))
}
