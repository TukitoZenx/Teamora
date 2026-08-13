import { stripPaginationFromHtml } from './pageFlow'

const PAPER_CSS = {
  A4: { portrait: '210mm 297mm', landscape: '297mm 210mm' },
  Letter: { portrait: '8.5in 11in', landscape: '11in 8.5in' },
  Legal: { portrait: '8.5in 14in', landscape: '14in 8.5in' }
}

const fontCss = (fontFamily) => {
  if (fontFamily === 'Sans-Serif') return 'Inter, system-ui, sans-serif'
  if (fontFamily === 'Serif') return 'Georgia, "Times New Roman", serif'
  if (fontFamily === 'Monospace') return '"Courier New", ui-monospace, monospace'
  return fontFamily || 'Inter, system-ui, sans-serif'
}

/**
 * Build a print/export HTML document that matches the editor page layout.
 */
export function buildPrintHtml({
  title = 'Document',
  bodyHtml = '',
  paperSize = 'A4',
  orientation = 'portrait',
  marginIn = 1,
  pageColor = '#ffffff',
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
  const margin = `${marginIn}in`
  const safeTitle = String(title || 'Document')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  const cleanBody = stripPaginationFromHtml(bodyHtml)

  const overlayHtml = (overlays || [])
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
      ">${String(item.text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page {
      size: ${size};
      margin: ${margin};
    }
    html, body {
      margin: 0;
      padding: 0;
      background: ${pageColor};
      color: #0f172a;
      font-family: ${fontCss(fontFamily)};
      font-size: ${fontSize};
      line-height: ${lineSpacing};
    }
    .page-root {
      position: relative;
      background: ${pageColor};
      column-count: ${Number(columnsCount) || 1};
      column-gap: 24px;
      ${pageBorder && pageBorder !== 'none' ? `border: 2px ${pageBorder} #94a3b8; padding: 8px;` : ''}
    }
    .page-root img,
    .page-root video,
    .page-root table {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
    }
    h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
    p, li { orphans: 3; widows: 3; }
    .page-break, [data-page-break="true"] {
      break-after: page;
      page-break-after: always;
      border: none !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      color: transparent !important;
      overflow: hidden;
    }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #cbd5e1; padding: 6px 8px; }
    .overlay { position: absolute; z-index: 5; }
    @media print {
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page-root">
    ${cleanBody}
    ${overlayHtml}
  </div>
  ${
    showPageNumbers
      ? `<script>
    (function () {
      // Page numbers are handled by the browser footer when printing;
      // keep format available for future running headers.
      window.__teamoraPageFormat = ${JSON.stringify(pageNumberFormat)};
    })();
  </script>`
      : ''
  }
</body>
</html>`
}
