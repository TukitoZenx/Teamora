/**
 * Print-layout pagination for the Quill document editor.
 *
 * Quill is a single continuous editor. Visual pages are created by injecting a
 * stylesheet that adds margin after blocks that would otherwise sit in the
 * inter-page gutter. No extra nodes are written into the editor, so Yjs / save
 * / export stay clean.
 */

const MAX_DOCUMENT_PAGES = 80
const STYLE_ID = 'teamora-page-flow-style'

export const stripPaginationFromHtml = (html) => {
  if (!html || typeof html !== 'string') return html || ''
  return html
    .replace(/<div[^>]*data-page-flow-spacer[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/\sdata-page-flow-pad="[^"]*"/gi, '')
    .replace(/\sdata-page-break="true"/gi, ' data-page-break="true"')
}

const isManualPageBreak = (el) => {
  if (!el || el.nodeType !== 1) return false
  if (el.classList?.contains('page-break')) return true
  if (el.getAttribute?.('data-page-break') === 'true') return true
  return Boolean(el.querySelector?.('.page-break, [data-page-break="true"]'))
}

const constrainOversizedMedia = (root, maxContentH) => {
  const limit = Math.max(80, maxContentH - 8)
  root.querySelectorAll('img, video, iframe, table, .ql-video').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    node.style.maxWidth = '100%'
    node.style.maxHeight = `${limit}px`
    node.style.height = 'auto'
    node.style.objectFit = 'contain'
  })
}

const ensureStyleTag = () => {
  let tag = document.getElementById(STYLE_ID)
  if (!tag) {
    tag = document.createElement('style')
    tag.id = STYLE_ID
    document.head.appendChild(tag)
  }
  return tag
}

const clearFlowStyle = (root) => {
  if (root) {
    delete root.dataset.pageFlowKey
    root.style.minHeight = ''
  }
}

/**
 * Reflow the Quill editor so block content never occupies the visual gutter
 * between pages. Returns the number of pages required.
 */
export function reflowDocumentPages(root, { pageH, pageGap, marginPx, enabled }) {
  if (!(root instanceof HTMLElement)) return 1
  if (root.dataset.paginating === '1') return Number(root.dataset.pageCount || 1)

  const styleTag = ensureStyleTag()
  const editorKey = root.dataset.pageFlowId || `pf-${Math.random().toString(36).slice(2, 8)}`
  root.dataset.pageFlowId = editorKey

  root.dataset.paginating = '1'
  try {
    if (!enabled) {
      styleTag.textContent = ''
      clearFlowStyle(root)
      root.style.minHeight = `${pageH}px`
      root.dataset.pageCount = '1'
      return 1
    }

    const footerReserve = 28
    const usable = Math.max(120, pageH - marginPx * 2 - footerReserve)
    constrainOversizedMedia(root, usable)

    // Clear previous flow margins so measurements are against raw content.
    styleTag.textContent = `[data-page-flow-id="${editorKey}"] { min-height: ${pageH}px; }`
    void root.offsetHeight

    const blocks = [...root.children].filter(
      (el) => el.nodeType === 1 && !el.hasAttribute?.('data-page-flow-spacer')
    )
    if (blocks.length === 0) {
      styleTag.textContent = `[data-page-flow-id="${editorKey}"] { min-height: ${pageH}px; }`
      root.dataset.pageCount = '1'
      return 1
    }

    const rules = []
    let pageIndex = 0
    // offsetTop is relative to the padded editor; usable is the content band.
    let pageContentEnd = usable

    blocks.forEach((block, i) => {
      const top = block.offsetTop
      const height = Math.max(0, block.offsetHeight)
      const bottom = top + height
      const selector = `[data-page-flow-id="${editorKey}"] > *:nth-child(${i + 1})`

      if (isManualPageBreak(block)) {
        const remain = Math.max(0, pageContentEnd - bottom)
        const extra = remain + pageGap + marginPx
        if (extra > 1 && pageIndex < MAX_DOCUMENT_PAGES - 1) {
          rules.push(`${selector} { margin-bottom: ${Math.round(extra)}px !important; }`)
          pageIndex += 1
          pageContentEnd = bottom + extra + usable
        }
        return
      }

      if (top >= pageContentEnd - 1 && pageIndex < MAX_DOCUMENT_PAGES - 1) {
        // Previous sibling should have pushed us; if not, pad the previous block.
        const prevSelector = i > 0 ? `[data-page-flow-id="${editorKey}"] > *:nth-child(${i})` : selector
        const remain = Math.max(0, pageContentEnd - (i > 0 ? blocks[i - 1].offsetTop + blocks[i - 1].offsetHeight : top))
        const extra = remain + pageGap + marginPx
        if (extra > 1) {
          rules.push(`${prevSelector} { margin-bottom: ${Math.round(extra)}px !important; }`)
          pageIndex += 1
          pageContentEnd += extra + (pageContentEnd - top < 0 ? 0 : 0)
          pageContentEnd = top + extra + usable
        }
        return
      }

      if (bottom > pageContentEnd + 2 && top < pageContentEnd && pageIndex < MAX_DOCUMENT_PAGES - 1) {
        if (height > usable - 4) {
          const remain = Math.max(0, pageContentEnd - bottom)
          const extra = remain + pageGap + marginPx
          if (extra > 1) {
            rules.push(`${selector} { margin-bottom: ${Math.round(extra)}px !important; }`)
            pageIndex += 1
            pageContentEnd = bottom + extra + usable
          }
        } else {
          // Move this whole block to the next page by padding the previous sibling.
          const prevSelector = i > 0 ? `[data-page-flow-id="${editorKey}"] > *:nth-child(${i})` : selector
          const remain = Math.max(0, pageContentEnd - top)
          const extra = remain + pageGap + marginPx
          if (extra > 1) {
            rules.push(`${prevSelector} { margin-bottom: ${Math.round(extra)}px !important; }`)
            pageIndex += 1
            pageContentEnd = top + extra + usable
          }
        }
      }
    })

    const pages = Math.min(MAX_DOCUMENT_PAGES, pageIndex + 1)
    const minH = pages * pageH + Math.max(0, pages - 1) * pageGap
    styleTag.textContent = [
      `[data-page-flow-id="${editorKey}"] { min-height: ${minH}px; }`,
      `[data-page-flow-id="${editorKey}"] img, [data-page-flow-id="${editorKey}"] table, [data-page-flow-id="${editorKey}"] video { max-width: 100%; }`,
      ...rules
    ].join('\n')

    root.style.minHeight = `${minH}px`
    root.dataset.pageCount = String(pages)
    return pages
  } finally {
    delete root.dataset.paginating
  }
}
