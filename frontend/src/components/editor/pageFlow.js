/**
 * Print-layout pagination for the Quill document editor.
 *
 * Quill stays a single continuous editor. Visual page cards and gutter overlays
 * are painted around it. This module only:
 *   1. Counts how many page sheets the content needs
 *   2. Adds CSS margin when a whole block would start in the gutter
 *   3. Honors explicit user page-breaks
 *
 * No spacer nodes are written into the editor (they were being adopted by
 * Quill as real blocks and exploding the page count while typing).
 */

const MAX_DOCUMENT_PAGES = 80
const STYLE_ID = 'teamora-page-flow-style'
const SPACER_ATTR = 'data-page-flow-spacer'

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
  return false
}

const isSpacer = (el) => {
  if (!(el instanceof HTMLElement)) return false
  if (el.hasAttribute(SPACER_ATTR)) return true
  if (el.getAttribute('aria-hidden') === 'true' && el.getAttribute('contenteditable') === 'false') {
    const style = el.getAttribute('style') || ''
    if (/float:\s*left/i.test(style) && /clear:\s*both/i.test(style)) return true
  }
  return false
}

const contentBlocks = (root) => [...root.children].filter((el) => el.nodeType === 1 && !isSpacer(el))

const removeSpacers = (root) => {
  ;[...root.children].forEach((node) => {
    if (isSpacer(node)) node.remove()
  })
  root.querySelectorAll(`[${SPACER_ATTR}]`).forEach((node) => node.remove())
}

const constrainOversizedMedia = (root, maxContentH) => {
  const limit = Math.max(80, maxContentH - 8)
  root.querySelectorAll('img, video, iframe, table, .ql-video').forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    node.style.maxWidth = '100%'
    node.style.height = 'auto'
    node.style.maxHeight = `${limit}px`
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
  if (!root) return
  delete root.dataset.pageFlowKey
  root.style.minHeight = ''
}

const clearBlockPads = (blocks) => {
  blocks.forEach((block) => {
    if (block.dataset.pageFlowPad) {
      block.style.marginBottom = ''
      delete block.dataset.pageFlowPad
    }
  })
}

/**
 * Reflow print layout. Returns the number of visual page sheets required.
 */
export function reflowDocumentPages(root, { pageH, pageGap, marginPx, enabled }) {
  if (!(root instanceof HTMLElement)) return 1
  if (root.dataset.paginating === '1') return Number(root.dataset.pageCount || 1)

  const styleTag = ensureStyleTag()
  const editorKey = root.dataset.pageFlowId || `pf-${Math.random().toString(36).slice(2, 8)}`
  root.dataset.pageFlowId = editorKey
  root.dataset.paginating = '1'

  try {
    removeSpacers(root)

    const blocks = contentBlocks(root)
    clearBlockPads(blocks)

    if (!enabled) {
      styleTag.textContent = ''
      clearFlowStyle(root)
      root.style.minHeight = `${pageH}px`
      root.dataset.pageCount = '1'
      return 1
    }

    const footerReserve = 28
    const usable = Math.max(120, pageH - marginPx * 2 - footerReserve)
    const stride = pageH + pageGap
    constrainOversizedMedia(root, usable)

    styleTag.textContent = `[data-page-flow-id="${editorKey}"] { min-height: ${pageH}px; }`
    void root.offsetHeight

    if (blocks.length === 0) {
      root.style.minHeight = `${pageH}px`
      root.dataset.pageCount = '1'
      return 1
    }

    let pageContentEnd = usable
    let extraPagesFromBreaks = 0

    blocks.forEach((block) => {
      const top = block.offsetTop
      const height = Math.max(0, block.offsetHeight)
      const bottom = top + height

      if (isManualPageBreak(block)) {
        const remain = Math.max(0, pageContentEnd - bottom)
        if (remain > 1 && extraPagesFromBreaks < MAX_DOCUMENT_PAGES - 1) {
          block.style.marginBottom = `${Math.round(remain + pageGap + marginPx)}px`
          block.dataset.pageFlowPad = '1'
          extraPagesFromBreaks += 1
          pageContentEnd = bottom + remain + pageGap + marginPx + usable
        }
        return
      }

      // Whole block starts in the gutter / bottom margin: push it onto the next sheet.
      if (top < pageContentEnd && bottom > pageContentEnd + 2 && height <= usable - 4) {
        const remain = Math.max(0, pageContentEnd - top)
        const extra = remain + pageGap + marginPx
        if (extra > 1) {
          const prev = block.previousElementSibling
          const target = prev && !isManualPageBreak(prev) && !isSpacer(prev) ? prev : block
          target.style.marginBottom = `${Math.round((parseFloat(target.style.marginBottom) || 0) + extra)}px`
          target.dataset.pageFlowPad = '1'
          pageContentEnd = top + extra + usable
        }
        return
      }

      while (bottom > pageContentEnd + 2 && extraPagesFromBreaks < MAX_DOCUMENT_PAGES - 1) {
        pageContentEnd += usable + pageGap + marginPx
      }
    })

    const measured = blocks.reduce((max, block) => Math.max(max, block.offsetTop + block.offsetHeight), 0)
    // offsetTop is inside the padded editor; add top padding so the last line maps onto a sheet.
    const visualBottom = measured + marginPx
    const pagesFromHeight = Math.max(1, Math.ceil(visualBottom / stride))
    const pages = Math.min(MAX_DOCUMENT_PAGES, Math.max(pagesFromHeight, extraPagesFromBreaks + 1))
    const minH = pages * pageH + Math.max(0, pages - 1) * pageGap

    styleTag.textContent = [
      `[data-page-flow-id="${editorKey}"] { min-height: ${minH}px; }`,
      `[data-page-flow-id="${editorKey}"] img, [data-page-flow-id="${editorKey}"] table, [data-page-flow-id="${editorKey}"] video { max-width: 100%; }`
    ].join('\n')

    root.style.minHeight = `${minH}px`
    root.dataset.pageCount = String(pages)
    return pages
  } finally {
    delete root.dataset.paginating
  }
}
