import { stripPaginationFromHtml } from './pageFlow'

const PAPER_CSS = {
  A4: { portrait: '210mm 297mm', landscape: '297mm 210mm' },
  Letter: { portrait: '8.5in 11in', landscape: '11in 8.5in' },
  Legal: { portrait: '8.5in 14in', landscape: '14in 8.5in' }
}

const PAGE_PX = {
  A4: { w: 794, h: 1123 },
  Letter: { w: 816, h: 1056 },
  Legal: { w: 816, h: 1344 }
}

const MAX_CANVAS_EDGE = 16000

const fontCss = (fontFamily) => {
  if (fontFamily === 'Sans-Serif') return 'Inter, system-ui, sans-serif'
  if (fontFamily === 'Serif') return 'Georgia, "Times New Roman", serif'
  if (fontFamily === 'Monospace') return '"Courier New", ui-monospace, monospace'
  return fontFamily || 'Inter, system-ui, sans-serif'
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

/**
 * Quill 2 editor rules (not toolbar). Keep these aligned with quill.snow.css
 * so typed/pasted HTML wraps and lists the same way as on screen.
 */
const QUILL_EDITOR_CSS = `
  .ql-editor {
    box-sizing: border-box;
    counter-reset: list-0 list-1 list-2 list-3 list-4 list-5 list-6 list-7 list-8 list-9;
    outline: none;
    tab-size: 4;
    text-align: left;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .ql-editor p, .ql-editor ol, .ql-editor pre, .ql-editor blockquote,
  .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6 {
    margin: 0;
    padding: 0;
  }
  .ql-editor h1 { font-size: 2em; }
  .ql-editor h2 { font-size: 1.5em; }
  .ql-editor h3 { font-size: 1.17em; }
  .ql-editor h4 { font-size: 1em; }
  .ql-editor h5 { font-size: .83em; }
  .ql-editor h6 { font-size: .67em; }
  .ql-editor a { color: #2563eb; text-decoration: underline; }
  .ql-editor ol { padding-left: 1.5em; }
  .ql-editor li { list-style-type: none; padding-left: 1.5em; position: relative; }
  .ql-editor li > .ql-ui:before {
    display: inline-block;
    margin-left: -1.5em;
    margin-right: .3em;
    text-align: right;
    white-space: nowrap;
    width: 1.2em;
  }
  .ql-editor li[data-list=bullet] > .ql-ui:before { content: '\\2022'; }
  .ql-editor li[data-list=checked] > .ql-ui:before { content: '\\2611'; }
  .ql-editor li[data-list=unchecked] > .ql-ui:before { content: '\\2610'; }
  .ql-editor li[data-list=ordered] { counter-increment: list-0; }
  .ql-editor li[data-list=ordered] > .ql-ui:before { content: counter(list-0, decimal) '. '; }
  .ql-editor li[data-list=ordered].ql-indent-1 { counter-increment: list-1; }
  .ql-editor li[data-list=ordered].ql-indent-1 > .ql-ui:before { content: counter(list-1, lower-alpha) '. '; }
  .ql-editor li[data-list=ordered].ql-indent-2 { counter-increment: list-2; }
  .ql-editor li[data-list=ordered].ql-indent-2 > .ql-ui:before { content: counter(list-2, lower-roman) '. '; }
  .ql-editor li[data-list=ordered].ql-indent-3 { counter-increment: list-3; }
  .ql-editor li[data-list=ordered].ql-indent-3 > .ql-ui:before { content: counter(list-3, decimal) '. '; }
  .ql-editor .ql-indent-1:not(.ql-direction-rtl) { padding-left: 3em; }
  .ql-editor li.ql-indent-1:not(.ql-direction-rtl) { padding-left: 4.5em; }
  .ql-editor .ql-indent-2:not(.ql-direction-rtl) { padding-left: 6em; }
  .ql-editor li.ql-indent-2:not(.ql-direction-rtl) { padding-left: 7.5em; }
  .ql-editor .ql-indent-3:not(.ql-direction-rtl) { padding-left: 9em; }
  .ql-editor li.ql-indent-3:not(.ql-direction-rtl) { padding-left: 10.5em; }
  .ql-editor .ql-indent-4:not(.ql-direction-rtl) { padding-left: 12em; }
  .ql-editor li.ql-indent-4:not(.ql-direction-rtl) { padding-left: 13.5em; }
  .ql-editor .ql-indent-5:not(.ql-direction-rtl) { padding-left: 15em; }
  .ql-editor li.ql-indent-5:not(.ql-direction-rtl) { padding-left: 16.5em; }
  .ql-editor .ql-indent-6:not(.ql-direction-rtl) { padding-left: 18em; }
  .ql-editor li.ql-indent-6:not(.ql-direction-rtl) { padding-left: 19.5em; }
  .ql-editor .ql-indent-7:not(.ql-direction-rtl) { padding-left: 21em; }
  .ql-editor li.ql-indent-7:not(.ql-direction-rtl) { padding-left: 22.5em; }
  .ql-editor .ql-indent-8:not(.ql-direction-rtl) { padding-left: 24em; }
  .ql-editor li.ql-indent-8:not(.ql-direction-rtl) { padding-left: 25.5em; }
  .ql-editor .ql-ui { position: absolute; }
  .ql-editor table { border-collapse: collapse; table-layout: fixed; width: 100%; }
  .ql-editor td { border: 1px solid #000; padding: 2px 5px; }
  .ql-editor blockquote { border-left: 4px solid #ccc; margin: 5px 0; padding-left: 16px; }
  .ql-editor pre, .ql-editor .ql-code-block-container {
    background-color: #f0f0f0;
    border-radius: 3px;
    font-family: ui-monospace, monospace;
    white-space: pre-wrap;
  }
  .ql-editor .ql-code-block-container { margin: 5px 0; padding: 5px 10px; }
  .ql-editor img { max-width: 100%; height: auto; }
  .ql-editor .ql-align-center { text-align: center; }
  .ql-editor .ql-align-justify { text-align: justify; }
  .ql-editor .ql-align-right { text-align: right; }
  .ql-editor .ql-font-serif { font-family: Georgia, "Times New Roman", serif; }
  .ql-editor .ql-font-monospace { font-family: Monaco, "Courier New", monospace; }
  .ql-editor .ql-font-Georgia { font-family: Georgia, serif; }
  .ql-editor .ql-font-Trebuchet-MS, .ql-editor .ql-font-TrebuchetMS { font-family: "Trebuchet MS", sans-serif; }
  .ql-editor .ql-font-Courier-New { font-family: "Courier New", monospace; }
  .ql-editor .ql-size-small { font-size: .75em; }
  .ql-editor .ql-size-large { font-size: 1.5em; }
  .ql-editor .ql-size-huge { font-size: 2.5em; }
  .ql-editor .ql-color-red { color: #e60000; }
  .ql-editor .ql-color-orange { color: #f90; }
  .ql-editor .ql-color-yellow { color: #ff0; }
  .ql-editor .ql-color-green { color: #008a00; }
  .ql-editor .ql-color-blue { color: #06c; }
  .ql-editor .ql-color-purple { color: #93f; }
  .ql-editor .ql-color-white { color: #fff; }
  .ql-editor .ql-bg-black { background-color: #000; }
  .ql-editor .ql-bg-red { background-color: #e60000; }
  .ql-editor .ql-bg-orange { background-color: #f90; }
  .ql-editor .ql-bg-yellow { background-color: #ff0; }
  .ql-editor .ql-bg-green { background-color: #008a00; }
  .ql-editor .ql-bg-blue { background-color: #06c; }
  .ql-editor .ql-bg-purple { background-color: #93f; }
  .ql-editor .ql-direction-rtl { direction: rtl; text-align: inherit; }
  .ql-editor .page-break, .ql-editor [data-page-break="true"] {
    display: block;
    border: none;
    border-top: 1px dashed #94a3b8;
    height: 18px;
    margin: 8px 0 0;
    color: #94a3b8;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    overflow: hidden;
  }
  .overlay { position: absolute; z-index: 5; }
`

export const buildExportCss = ({
  pageColor = '#ffffff',
  textColor = '#0f172a',
  fontFamily = 'Sans-Serif',
  fontSize = '16px',
  lineSpacing = '1.15',
  columnsCount = '1',
  pageBorder = 'none',
  marginPx = 96
}) => {
  const border = pageBorder && pageBorder !== 'none' ? `border: 2px ${pageBorder} #94a3b8;` : 'border: none;'
  return `
    ${QUILL_EDITOR_CSS}
    .page-root.ql-editor {
      position: relative;
      background: ${pageColor};
      color: ${textColor || '#0f172a'};
      font-family: ${fontCss(fontFamily)};
      font-size: ${fontSize};
      line-height: ${lineSpacing};
      column-count: ${Number(columnsCount) || 1};
      column-gap: 24px;
      padding: ${Math.max(0, Number(marginPx) || 0)}px;
      color-scheme: only light;
      ${border}
    }
  `
}

export const buildOverlayHtml = (overlays = []) =>
  (overlays || [])
    .map((item) => {
      const family = fontCss(item.fontFamily)
      const isLine = item.shape === 'line'
      return `<div class="overlay ${item.kind || ''}" style="
        left:${item.x || 0}px;
        top:${item.y || 0}px;
        width:${item.width || 120}px;
        height:${isLine ? Math.max(item.borderWidth || 2, 2) : item.height || 80}px;
        transform:rotate(${item.rotation || 0}deg);
        background:${item.fill || 'transparent'};
        border:${item.borderWidth || 1}px solid ${item.borderColor || '#94a3b8'};
        border-radius:${item.borderRadius != null ? item.borderRadius : 4}px;
        opacity:${item.opacity != null ? item.opacity : 1};
        color:${item.color || '#0f172a'};
        font-family:${family};
        font-size:${item.fontSize || '16px'};
        font-weight:${item.bold ? 700 : 400};
        font-style:${item.italic ? 'italic' : 'normal'};
        text-decoration:${item.underline ? 'underline' : 'none'};
        text-align:${item.align || 'left'};
        box-sizing:border-box;
        padding:8px;
        white-space:pre-wrap;
        overflow:hidden;
      ">${escapeHtml(item.text || '')}</div>`
    })
    .join('')

export function buildPrintHtml({
  title = 'Document',
  bodyHtml = '',
  paperSize = 'A4',
  orientation = 'portrait',
  marginIn = 1,
  pageColor = '#ffffff',
  textColor = '#0f172a',
  fontFamily = 'Sans-Serif',
  fontSize = '16px',
  lineSpacing = '1.15',
  columnsCount = '1',
  pageBorder = 'none',
  overlays = [],
  pageNumberFormat = 'Page {n} of {total}',
  showPageNumbers = true
}) {
  const size = PAPER_CSS[paperSize]?.[orientation] || PAPER_CSS.A4.portrait
  const marginPx = Math.round((Number(marginIn) || 1) * 96)
  const safeTitle = escapeHtml(title || 'Document')
  const cleanBody = stripPaginationFromHtml(bodyHtml)
  const css = buildExportCss({
    pageColor,
    textColor,
    fontFamily,
    fontSize,
    lineSpacing,
    columnsCount,
    pageBorder,
    marginPx
  })

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page { size: ${size}; margin: 0; }
    html, body {
      margin: 0;
      padding: 0;
      background: ${pageColor};
      color: ${textColor || '#0f172a'};
      color-scheme: only light;
    }
    ${css}
  </style>
</head>
<body>
  <div class="ql-editor page-root">
    ${cleanBody}
    ${buildOverlayHtml(overlays)}
  </div>
  ${showPageNumbers ? `<script>window.__teamoraPageFormat = ${JSON.stringify(pageNumberFormat)};</script>` : ''}
</body>
</html>`
}

const waitForImages = (root) => {
  const imgs = [...root.querySelectorAll('img')]
  return Promise.all(
    imgs.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalWidth) {
            resolve()
            return
          }
          const done = () => resolve()
          img.addEventListener('load', done, { once: true })
          img.addEventListener('error', done, { once: true })
          window.setTimeout(done, 5000)
        })
    )
  )
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

const inlineImages = async (root) => {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(async (img) => {
      const src = img.getAttribute('src') || img.currentSrc || ''
      if (!src || src.startsWith('data:')) return
      try {
        const res = await fetch(src, { mode: 'cors' })
        if (!res.ok) return
        const blob = await res.blob()
        if (!blob.type.startsWith('image/')) return
        img.src = await blobToDataUrl(blob)
      } catch {
        // same-origin images can still paint
      }
    })
  )
}

const copyImageLayout = (sourceRoot, cloneRoot) => {
  if (!sourceRoot || !cloneRoot) return
  const srcImgs = [...sourceRoot.querySelectorAll('img')]
  const dstImgs = [...cloneRoot.querySelectorAll('img')]
  dstImgs.forEach((img, i) => {
    const src = srcImgs[i]
    if (!src) return
    const w = src.offsetWidth
    const h = src.offsetHeight
    if (w > 0) img.style.width = `${w}px`
    if (h > 0) img.style.height = `${h}px`
  })
}

const cleanClone = (root) => {
  root.querySelectorAll('[data-page-flow-spacer], .ql-cursor').forEach((node) => node.remove())
  root.querySelectorAll('[data-page-flow-pad]').forEach((node) => {
    node.style.marginBottom = ''
    node.removeAttribute('data-page-flow-pad')
  })
}

const sliceCanvas = (full, pagePx, background) => {
  const pages = []
  const width = full.width
  let y = 0
  while (y < full.height - 1) {
    const height = Math.min(pagePx, full.height - y)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = background || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(full, 0, y, width, height, 0, 0, width, height)
    pages.push(canvas)
    y += height
  }
  return pages.length ? pages : [full]
}

const capturePages = async (html2canvas, el, pageW, pageH, scale, background) => {
  const total = Math.max(el.scrollHeight, el.offsetHeight, pageH)
  const common = {
    scale,
    useCORS: true,
    allowTaint: false,
    backgroundColor: background || '#ffffff',
    logging: false,
    imageTimeout: 8000,
    removeContainer: true,
    width: pageW,
    windowWidth: pageW,
    scrollX: 0,
    scrollY: 0,
    onclone: (_doc, cloned) => {
      cloned.style.height = 'auto'
      cloned.style.maxHeight = 'none'
      cloned.style.overflow = 'visible'
    }
  }

  if (total * scale <= MAX_CANVAS_EDGE) {
    const full = await html2canvas(el, { ...common, height: total, windowHeight: total })
    return sliceCanvas(full, Math.round(pageH * scale), background)
  }

  const pages = []
  const count = Math.max(1, Math.ceil(total / pageH))
  for (let i = 0; i < count; i += 1) {
    const y = i * pageH
    const height = Math.min(pageH, total - y)
    pages.push(
      await html2canvas(el, {
        ...common,
        x: 0,
        y,
        height,
        windowHeight: height
      })
    )
  }
  return pages
}

const buildLiveClone = ({
  quill,
  pageW,
  marginPx,
  pageColor,
  textColor,
  fontFamily,
  fontSize,
  lineSpacing,
  columnsCount,
  pageBorder
}) => {
  const source = quill?.root
  const clone = source instanceof HTMLElement ? source.cloneNode(true) : document.createElement('div')
  if (!(source instanceof HTMLElement)) {
    clone.innerHTML = '<p><br></p>'
  }
  cleanClone(clone)
  clone.classList.add('ql-editor', 'page-root')
  clone.removeAttribute('data-placeholder')
  clone.classList.remove('ql-blank')

  const computed = source instanceof HTMLElement ? window.getComputedStyle(source) : null
  const family = computed?.fontFamily || fontCss(fontFamily)
  const size = computed?.fontSize || fontSize
  const leading = computed?.lineHeight && computed.lineHeight !== 'normal' ? computed.lineHeight : lineSpacing
  const color = textColor && textColor !== 'inherit' ? textColor : computed?.color || '#0f172a'
  const border = pageBorder && pageBorder !== 'none' ? `2px ${pageBorder} #94a3b8` : 'none'

  clone.style.cssText = [
    `width:${pageW}px`,
    `padding:${marginPx}px`,
    'box-sizing:border-box',
    `background:${pageColor || '#ffffff'}`,
    `color:${color}`,
    `font-family:${family}`,
    `font-size:${size}`,
    `line-height:${leading}`,
    `column-count:${Number(columnsCount) || 1}`,
    'column-gap:24px',
    'white-space:pre-wrap',
    'word-wrap:break-word',
    'overflow:visible',
    'height:auto',
    'min-height:0',
    `border:${border}`,
    'color-scheme:only light',
    'outline:none'
  ].join(';')

  if (source instanceof HTMLElement) copyImageLayout(source, clone)
  return clone
}

/**
 * Rasterize a live-editor clone so the PDF matches typed/pasted content.
 */
export async function exportDocumentToPdf({
  quill,
  title = 'Document',
  bodyHtml = '',
  paperSize = 'A4',
  orientation = 'portrait',
  marginIn = 1,
  pageColor = '#ffffff',
  textColor = '#0f172a',
  fontFamily = 'Sans-Serif',
  fontSize = '16px',
  lineSpacing = '1.15',
  columnsCount = '1',
  pageBorder = 'none',
  overlays = [],
  pageWidthPx,
  pageHeightPx
}) {
  const [{ default: html2canvas }, jspdfMod] = await Promise.all([import('html2canvas'), import('jspdf')])
  const JsPDF = jspdfMod.jsPDF || jspdfMod.default
  if (typeof html2canvas !== 'function' || typeof JsPDF !== 'function') {
    throw new Error('PDF libraries failed to load')
  }

  const base = PAGE_PX[paperSize] || PAGE_PX.A4
  const pageW = pageWidthPx || (orientation === 'landscape' ? base.h : base.w)
  const pageH = pageHeightPx || (orientation === 'landscape' ? base.w : base.h)
  const marginPx = Math.round((Number(marginIn) || 1) * 96)
  const paper = pageColor || '#ffffff'
  const ink = textColor && textColor !== 'inherit' ? textColor : '#0f172a'

  const host = document.createElement('div')
  host.setAttribute('data-teamora-pdf-export', 'true')
  host.style.cssText = [
    'position:fixed',
    'left:-14000px',
    'top:0',
    `width:${pageW}px`,
    `background:${paper}`,
    'color-scheme:only light',
    'z-index:0',
    'pointer-events:none'
  ].join(';')

  const css = buildExportCss({
    pageColor: paper,
    textColor: ink,
    fontFamily,
    fontSize,
    lineSpacing,
    columnsCount,
    pageBorder,
    marginPx
  })
  const style = document.createElement('style')
  style.textContent = css
  host.appendChild(style)

  let root
  if (quill?.root instanceof HTMLElement) {
    root = buildLiveClone({
      quill,
      pageW,
      marginPx,
      pageColor: paper,
      textColor: ink,
      fontFamily,
      fontSize,
      lineSpacing,
      columnsCount,
      pageBorder
    })
  } else {
    root = document.createElement('div')
    root.className = 'ql-editor page-root'
    root.innerHTML = stripPaginationFromHtml(bodyHtml || '<p><br></p>') + buildOverlayHtml(overlays)
  }

  if (overlays?.length && !root.querySelector('.overlay')) {
    root.insertAdjacentHTML('beforeend', buildOverlayHtml(overlays))
  }

  host.appendChild(root)
  document.body.appendChild(host)

  try {
    await inlineImages(root)
    await waitForImages(root)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    const canvases = await capturePages(html2canvas, root, pageW, pageH, 2, paper)
    if (!canvases.length) throw new Error('PDF capture produced no pages')

    const format = paperSize === 'Legal' ? 'legal' : paperSize === 'A4' ? 'a4' : 'letter'
    const pdf = new JsPDF({
      unit: 'pt',
      format,
      orientation: orientation === 'landscape' ? 'landscape' : 'portrait',
      compress: true
    })
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = pdf.internal.pageSize.getHeight()

    canvases.forEach((canvas, index) => {
      if (index > 0) pdf.addPage()
      const data = canvas.toDataURL('image/jpeg', 0.95)
      const drawH = Math.min(pdfH, (canvas.height / canvas.width) * pdfW)
      pdf.addImage(data, 'JPEG', 0, 0, pdfW, drawH, undefined, 'FAST')
    })

    const safeName =
      String(title || 'document')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .trim() || 'document'
    pdf.save(`${safeName}.pdf`)
  } finally {
    host.remove()
  }
}
