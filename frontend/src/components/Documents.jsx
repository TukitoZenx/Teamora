import { useState, useEffect, useRef } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  Download,
  FileText,
  FolderOpen,
  Save,
  Copy,
  History,
  Image,
  Table2,
  Shapes,
  Link,
  Printer,
  MessageSquare,
  Trash2,
  X,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Sparkles
} from 'lucide-react'
import html2pdf from 'html2pdf.js'
import toast from 'react-hot-toast'

const FONTS = ['Sans-Serif', 'Serif', 'Monospace', 'Georgia', 'Courier New', 'Trebuchet MS']
const SIZES = ['12px', '14px', '16px', '18px', '24px', '32px']
const LINE_SPACINGS = ['1.0', '1.15', '1.5', '2.0']
const MARGINS = ['0.5 in', '0.75 in', '1.0 in']
const PAPER_SIZES = ['A4', 'Letter', 'Legal']

export default function Documents({
  mountElRef,
  quillRef,
  editorReady = false,
  isSaving,
  activeUsersCount,
  comments = [],
  socket,
  roomId,
  userName,
  versions = [],
  onRevertVersion,
  initialTitle,
  onCreateNewDocument,
  onRenameDocument,
  onDuplicateDocument,
  onForceSave,
  onDirtyChange,
  onMount
}) {
  const [docTitle, setDocTitle] = useState(initialTitle || 'Untitled Document')
  const [titleSource, setTitleSource] = useState(initialTitle || '')
  // Keep title in sync when switching between open document tabs.
  if ((initialTitle || '') !== titleSource) {
    setTitleSource(initialTitle || '')
    setDocTitle(initialTitle || 'Untitled Document')
  }
  const [openMenu, setOpenMenu] = useState(null) // 'file' | 'insert' | 'layout' | null
  const [activeSidePanel, setActiveSidePanel] = useState(null) // null | 'comments' | 'versions'
  const [commentInput, setCommentInput] = useState('')
  const menuBarRef = useRef(null)

  useEffect(() => {
    if (onMount) onMount()
  }, [onMount])

  // Click-outside / Escape closes ribbon menus. Use `click` (not mousedown) so
  // menu item onClick still fires before the menu unmounts.
  useEffect(() => {
    if (!openMenu) return undefined

    const handlePointerDown = (event) => {
      if (!menuBarRef.current?.contains(event.target)) {
        setOpenMenu(null)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    // Capture phase after the menu button's own click has been handled.
    document.addEventListener('click', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openMenu])

  const toggleMenu = (menuId) => {
    setOpenMenu((current) => (current === menuId ? null : menuId))
  }

  // Format states
  const [fontFamily, setFontFamily] = useState('Sans-Serif')
  const [fontSize, setFontSize] = useState('16px')
  const [lineSpacing, setLineSpacing] = useState('1.15')
  const [textColor, setTextColor] = useState('#1e293b')
  const [columnsCount, setColumnsCount] = useState('1')
  const [pageMargin, setPageMargin] = useState('1.0 in')
  const [paperSize, setPaperSize] = useState('A4')
  const [orientation, setOrientation] = useState('portrait')
  const [pageColor, setPageColor] = useState('#ffffff')
  const [pageBorder, setPageBorder] = useState('none')
  const [zoom, setZoom] = useState(100)

  // Stats
  const [stats, setStats] = useState({ words: 0, characters: 0, readTime: 1, pages: 1 })
  const [currentPage, setCurrentPage] = useState(1)
  const scrollContainerRef = useRef(null)

  // Scroll handler to monitor visible page
  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const scrollTop = scrollContainerRef.current.scrollTop
        const pageIdx = Math.max(1, Math.ceil((scrollTop + 300) / 1076))
        setCurrentPage(pageIdx)
      }
    }
    const el = scrollContainerRef.current
    if (el) {
      el.addEventListener('scroll', handleScroll)
    }
    return () => el?.removeEventListener('scroll', handleScroll)
  }, [])

  // Monitor statistics
  useEffect(() => {
    const interval = setInterval(() => {
      const quill = quillRef?.current
      if (quill) {
        const text = quill.getText().trim()
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0
        const chars = text.length
        const readTime = Math.max(1, Math.ceil(words / 200))
        const pages = Math.max(1, Math.ceil(quill.root.scrollHeight / 1076))
        setStats({ words, characters: chars, readTime, pages })
      }
    }, 800)
    return () => clearInterval(interval)
  }, [quillRef, editorReady])

  // Set page style rules dynamically on the Quill editor root
  useEffect(() => {
    const root = quillRef?.current?.root
    if (!(root instanceof HTMLElement)) return

    const family =
      fontFamily === 'Sans-Serif'
        ? 'sans-serif'
        : fontFamily === 'Serif'
          ? 'serif'
          : fontFamily === 'Monospace'
            ? 'monospace'
            : fontFamily
    const marginVal = pageMargin === '0.5 in' ? '0.5in' : pageMargin === '0.75 in' ? '0.75in' : '1in'
    const isDark = document.documentElement.classList.contains('dark')
    const sheetBg = pageColor || (isDark ? '#020617' : '#ffffff')
    const gapBg = isDark ? '#0f172a' : '#e2e8f0'

    root.setAttribute(
      'style',
      [
        `font-family:${family}`,
        `font-size:${fontSize}`,
        `line-height:${lineSpacing}`,
        `color:${textColor}`,
        `column-count:${columnsCount}`,
        'column-gap:24px',
        `padding:${marginVal}`,
        pageBorder === 'none' ? 'border:none' : `border:2px ${pageBorder} #cbd5e1`,
        `background:repeating-linear-gradient(to bottom,${sheetBg},${sheetBg} 1056px,${gapBg} 1056px,${gapBg} 1076px)`,
        'background-size:100% 1076px',
        orientation === 'landscape'
          ? 'aspect-ratio:1.414;max-width:1056px;min-height:816px'
          : 'aspect-ratio:0.707;max-width:816px;min-height:1056px'
      ].join(';')
    )
  }, [
    fontFamily,
    fontSize,
    lineSpacing,
    textColor,
    pageColor,
    columnsCount,
    pageMargin,
    pageBorder,
    orientation,
    editorReady,
    quillRef
  ])

  const applyFormat = (name, value) => {
    const quill = quillRef?.current
    if (!quill) {
      toast.error('Editor is not ready yet. Click in the page and try again.')
      return
    }

    quill.focus()
    // Force a selection so format applies even with a collapsed caret.
    let range = quill.getSelection(true)
    if (!range) {
      const end = Math.max(0, quill.getLength() - 1)
      quill.setSelection(end, 0, 'silent')
      range = quill.getSelection(true)
    }
    if (!range) return

    const current = quill.getFormat(range)

    if (name === 'bold' || name === 'italic' || name === 'underline' || name === 'strike') {
      quill.format(name, !current[name])
      quill.focus()
      return
    }

    if (name === 'list') {
      quill.format('list', current.list === value ? false : value)
      quill.focus()
      return
    }

    if (name === 'align') {
      quill.format('align', value || false)
      quill.focus()
      return
    }

    if (name === 'background' && current.background === value) {
      quill.format('background', false)
      quill.focus()
      return
    }

    quill.format(name, value)
    quill.focus()
  }

  const handleMenuAction = (action) => {
    setOpenMenu(null)
    const quill = quillRef?.current
    if (!quill && action !== 'newDoc') {
      toast.error('Editor is not ready yet. Click in the page and try again.')
      return
    }

    switch (action) {
      case 'newDoc': {
        if (onCreateNewDocument) {
          onCreateNewDocument()
          break
        }
        quill?.setText('')
        setDocTitle('Untitled Document')
        toast.success('New document ready.')
        break
      }
      case 'openDoc': {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.txt,.html,.htm,.md,text/plain,text/html'
        input.onchange = (e) => {
          const file = e.target.files?.[0]
          if (!file || !quill) return
          const reader = new FileReader()
          reader.onload = (evt) => {
            const raw = String(evt.target?.result || '')
            const looksHtml = /<\/?[a-z][\s\S]*>/i.test(raw)
            if (looksHtml) {
              quill.clipboard.dangerouslyPasteHTML(raw)
            } else {
              quill.setText(raw)
            }
            const baseName = file.name.replace(/\.[^.]+$/, '')
            setDocTitle(baseName)
            onRenameDocument?.(baseName)
            onDirtyChange?.(true)
            toast.success('Document imported!')
          }
          reader.readAsText(file)
        }
        input.click()
        break
      }
      case 'saveDoc': {
        onForceSave?.()
        if (socket && quill) {
          socket.emit('doc-content-sync', { roomId, html: quill.root.innerHTML })
        }
        onDirtyChange?.(false)
        toast.success('Document saved successfully!')
        break
      }
      case 'saveDraft': {
        const draftVersion = {
          versionId: 'ver-' + Math.random().toString(36).substring(7),
          timestamp: new Date().toLocaleTimeString() + ' ' + new Date().toLocaleDateString(),
          user: userName,
          data: quill.root.innerHTML
        }
        const updatedHistory = [draftVersion, ...ensureArray(versions)]
        socket?.emit('update-document-versions', { roomId, versions: updatedHistory })
        onForceSave?.()
        toast.success('Draft saved to Version History!')
        break
      }
      case 'renameDoc': {
        const newTitle = prompt('Enter document title:', docTitle)
        if (newTitle?.trim()) {
          const clean = newTitle.trim()
          setDocTitle(clean)
          onRenameDocument?.(clean)
          toast.success('Document renamed')
        }
        break
      }
      case 'duplicateDoc': {
        const dupTitle = `${docTitle} (Copy)`
        if (onDuplicateDocument) {
          onDuplicateDocument({ title: dupTitle, html: quill.root.innerHTML })
        } else {
          setDocTitle(dupTitle)
          onRenameDocument?.(dupTitle)
          toast.success('Document duplicated!')
        }
        break
      }
      case 'openVersions': {
        setActiveSidePanel('versions')
        break
      }
      case 'exportPdf': {
        const opt = {
          margin: 0.5,
          filename: `${docTitle}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: 'letter', orientation: orientation }
        }
        toast.promise(html2pdf().set(opt).from(quill.root).save(), {
          loading: 'Preparing PDF export...',
          success: 'Document exported successfully!',
          error: 'Failed to export PDF.'
        })
        break
      }
      case 'exportDocx': {
        // Honest HTML export (real OOXML DOCX is out of scope without a new dependency).
        const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${String(docTitle)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')}</title></head><body>${quill.root.innerHTML}</body></html>`
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = `${docTitle || 'document'}.html`
        link.click()
        URL.revokeObjectURL(link.href)
        toast.success('Exported as HTML.')
        break
      }
      case 'printDoc': {
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
          toast.error('Pop-up blocked. Allow pop-ups to print.')
          break
        }
        const safeTitle = String(docTitle || 'Document')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
        printWindow.document.write(`
          <html>
            <head>
              <title>${safeTitle}</title>
              <style>
                body { font-family: sans-serif; padding: 2in; line-height: 1.5; }
              </style>
            </head>
            <body>
              ${quill.root.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
        break
      }
      case 'insertImage': {
        const url = prompt('Enter Image URL:')
        if (url) {
          quill.focus()
          const range = quill.getSelection() || { index: quill.getLength() }
          quill.insertEmbed(range.index, 'image', url)
          toast.success('Image inserted!')
        }
        break
      }
      case 'insertTable': {
        const rows = prompt('Rows count:', '3')
        const cols = prompt('Columns count:', '3')
        if (rows && cols) {
          let tableHTML = '<table class="w-full border-collapse border border-border my-4">'
          for (let r = 0; r < parseInt(rows); r++) {
            tableHTML += '<tr>'
            for (let c = 0; c < parseInt(cols); c++) {
              tableHTML += '<td class="border border-border p-2 min-w-[50px] text-xs">Cell</td>'
            }
            tableHTML += '</tr>'
          }
          tableHTML += '</table>'
          quill.focus()
          const range = quill.getSelection() || { index: quill.getLength() }
          quill.clipboard.dangerouslyPasteHTML(range.index, tableHTML)
          toast.success('Table inserted!')
        }
        break
      }
      case 'insertLink': {
        const text = prompt('Link Text:')
        const href = prompt('Link URL (https://...):')
        if (text && href) {
          quill.focus()
          const range = quill.getSelection() || { index: quill.getLength() }
          quill.insertText(range.index, text, 'link', href)
          toast.success('Hyperlink inserted!')
        }
        break
      }
      case 'insertPageBreak': {
        quill.focus()
        const rangePb = quill.getSelection() || { index: quill.getLength() }
        quill.clipboard.dangerouslyPasteHTML(
          rangePb.index,
          '<div class="page-break" style="page-break-after: always; border-bottom: 2px dashed var(--tw-color-border); margin: 20px 0; text-align: center; font-size: 10px; color: var(--tw-color-muted); user-select: none;">--- Page Break ---</div>'
        )
        break
      }
      case 'insertHr': {
        quill.focus()
        const rangeHr = quill.getSelection() || { index: quill.getLength() }
        quill.clipboard.dangerouslyPasteHTML(rangeHr.index, '<hr class="my-4 border-border" />')
        break
      }
      case 'insertHeader': {
        const headerText = prompt('Enter header text:')
        if (headerText) {
          quill.focus()
          quill.clipboard.dangerouslyPasteHTML(
            0,
            `<div style="font-size: 10px; color: var(--tw-color-muted); border-bottom: 1px solid var(--tw-color-border); margin-bottom: 10px;">${headerText}</div>`
          )
        }
        break
      }
      case 'insertFooter': {
        const footerText = prompt('Enter footer text:')
        if (footerText) {
          quill.focus()
          quill.clipboard.dangerouslyPasteHTML(
            quill.getLength(),
            `<div style="font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 10px;">${footerText}</div>`
          )
        }
        break
      }
      case 'insertPageNumber': {
        quill.focus()
        const rangePn = quill.getSelection() || { index: quill.getLength() }
        quill.insertText(rangePn.index, ' [Page Number] ')
        break
      }
      case 'insertDate': {
        quill.focus()
        const rangeDate = quill.getSelection() || { index: quill.getLength() }
        quill.insertText(rangeDate.index, ` ${new Date().toLocaleDateString()} `)
        break
      }
      case 'insertShape': {
        const shape = prompt('Enter shape name (circle, square, triangle):', 'square')
        if (shape) {
          quill.focus()
          const rangeS = quill.getSelection() || { index: quill.getLength() }
          const shapeStyle = shape === 'circle' ? 'border-radius: 50%;' : ''
          quill.clipboard.dangerouslyPasteHTML(
            rangeS.index,
            `<div style="width: 80px; height: 80px; border: 2px solid #6366f1; background: #6366f120; ${shapeStyle} display: inline-block; margin: 5px;"></div>`
          )
        }
        break
      }
      case 'insertIcon': {
        quill.focus()
        const rangeI = quill.getSelection() || { index: quill.getLength() }
        quill.insertText(rangeI.index, ' ⭐ ')
        break
      }
      case 'insertEquation': {
        const eq = prompt('Enter math equation (LaTeX style):', 'E = mc^2')
        if (eq) {
          quill.focus()
          const rangeEq = quill.getSelection() || { index: quill.getLength() }
          quill.insertText(rangeEq.index, ` f(x) = ${eq} `)
        }
        break
      }
    }
  }

  const handleAddComment = () => {
    if (!commentInput.trim()) return
    const commentObj = {
      id: 'comment-' + Math.random().toString(36).substring(7),
      user: userName,
      text: commentInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    const updated = [...comments, commentObj]
    socket.emit('update-document-comments', { roomId, comments: updated })
    setCommentInput('')
    toast.success('Comment thread added!')
  }

  const handleDeleteComment = (commentId) => {
    const updated = comments.filter((c) => c.id !== commentId)
    socket.emit('update-document-comments', { roomId, comments: updated })
    toast.success('Comment resolved.')
  }

  return (
    <div className="flex-1 flex flex-col bg-card-sunken overflow-hidden h-full">
      {/* Title Bar */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={docTitle}
            onChange={(e) => {
              setDocTitle(e.target.value)
              onRenameDocument?.(e.target.value)
            }}
            className="font-semibold text-sm text-text bg-transparent border-none focus:outline-none focus:bg-primary/10 px-2 py-1 rounded-md max-w-[200px] md:max-w-md transition-colors"
            placeholder="Untitled Document"
          />
          {isSaving ? (
            <span className="text-[10px] text-primary animate-pulse bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
              Saving...
            </span>
          ) : (
            <span className="text-[10px] text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
              Saved
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'comments' ? null : 'comments')}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              activeSidePanel === 'comments'
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-card hover:bg-primary/10 border-border text-muted'
            }`}
            title="Comments Sidebar"
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveSidePanel(activeSidePanel === 'versions' ? null : 'versions')}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              activeSidePanel === 'versions'
                ? 'bg-primary text-on-primary border-primary'
                : 'bg-card hover:bg-primary/10 border-border text-muted'
            }`}
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Menu / Ribbon Bar — click to open (not hover), Escape / outside click to close */}
      <div
        ref={menuBarRef}
        className="h-9 border-b border-border bg-card-sunken/85 px-3 flex items-center gap-0.5 shrink-0 relative z-30 select-none"
      >
        {/* FILE */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'file'}
            onClick={() => toggleMenu('file')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              openMenu === 'file' ? 'bg-card text-text shadow-sm' : 'text-muted hover:bg-card hover:text-text'
            }`}
          >
            File
          </button>
          {openMenu === 'file' && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-dropdown z-50 min-w-[180px] py-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('newDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <FileText className="w-3.5 h-3.5" />
                New Document
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('openDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                Open...
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('saveDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('saveDraft')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Download className="w-3.5 h-3.5" />
                Save Draft
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('renameDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Type className="w-3.5 h-3.5" />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('duplicateDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('openVersions')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <History className="w-3.5 h-3.5" />
                Version History
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('exportPdf')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('exportDocx')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Download className="w-3.5 h-3.5" />
                Export HTML
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('printDoc')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          )}
        </div>

        {/* INSERT */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'insert'}
            onClick={() => toggleMenu('insert')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              openMenu === 'insert' ? 'bg-card text-text shadow-sm' : 'text-muted hover:bg-card hover:text-text'
            }`}
          >
            Insert
          </button>
          {openMenu === 'insert' && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-dropdown z-50 min-w-[180px] py-1"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertImage')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Image className="w-3.5 h-3.5" />
                Image URL
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertTable')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Table2 className="w-3.5 h-3.5" />
                Table Grid
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertLink')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Link className="w-3.5 h-3.5" />
                Hyperlink
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertPageBreak')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Page Break
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertHr')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Horizontal Line
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertHeader')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Header
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertFooter')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Footer
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertPageNumber')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Page Number
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertDate')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Current Date
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertShape')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                <Shapes className="w-3.5 h-3.5" />
                Shapes
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertIcon')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Icons (Star)
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => handleMenuAction('insertEquation')}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-primary/10 text-text hover:text-primary"
              >
                Math Equation
              </button>
            </div>
          )}
        </div>

        {/* LAYOUT */}
        <div className="relative">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={openMenu === 'layout'}
            onClick={() => toggleMenu('layout')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
              openMenu === 'layout' ? 'bg-card text-text shadow-sm' : 'text-muted hover:bg-card hover:text-text'
            }`}
          >
            Layout
          </button>
          {openMenu === 'layout' && (
            <div
              role="menu"
              className="absolute top-full left-0 mt-1 bg-card border border-border rounded-xl shadow-dropdown z-50 min-w-[200px] p-3 text-[11px] text-muted space-y-3"
            >
              <div>
                <span className="font-bold block mb-1">Margins</span>
                <div className="flex gap-1.5">
                  {MARGINS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setPageMargin(m)}
                      className={`px-2 py-0.5 border rounded cursor-pointer ${pageMargin === m ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-text hover:bg-primary/10'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block mb-1">Orientation</span>
                <div className="flex gap-1.5">
                  {['portrait', 'landscape'].map((o) => (
                    <button
                      key={o}
                      onClick={() => setOrientation(o)}
                      className={`px-2 py-0.5 border rounded cursor-pointer capitalize ${orientation === o ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-text hover:bg-primary/10'}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block mb-1">Paper Size</span>
                <div className="flex gap-1.5">
                  {PAPER_SIZES.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPaperSize(p)}
                      className={`px-2 py-0.5 border rounded cursor-pointer ${paperSize === p ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-text hover:bg-primary/10'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block mb-1">Columns</span>
                <div className="flex gap-1.5">
                  {['1', '2', '3'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setColumnsCount(c)}
                      className={`px-2.5 py-0.5 border rounded cursor-pointer ${columnsCount === c ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-text hover:bg-primary/10'}`}
                    >
                      {c} Col
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block mb-1">Page Color</span>
                <div className="grid grid-cols-4 gap-1">
                  {['#ffffff', '#f8fafc', '#fffbeb', '#f1f5f9'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setPageColor(c)}
                      style={{ backgroundColor: c }}
                      className={`h-6 rounded border cursor-pointer ${pageColor === c ? 'ring-2 ring-primary' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="font-bold block mb-1">Borders</span>
                <div className="flex gap-1.5">
                  {['none', 'solid', 'dashed', 'double'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setPageBorder(b)}
                      className={`px-2 py-0.5 border rounded cursor-pointer capitalize ${pageBorder === b ? 'bg-primary text-on-primary border-primary' : 'bg-card border-border text-text hover:bg-primary/10'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor Formatting Ribbon */}
      <div className="h-10 border-b border-border bg-card px-4 flex items-center gap-1.5 shrink-0 z-20 overflow-x-auto no-scrollbar">
        {/* Zoom Select */}
        <select
          value={zoom}
          onChange={(e) => setZoom(parseInt(e.target.value))}
          className="bg-card-sunken text-xs font-semibold px-2 py-1 rounded border border-border text-text cursor-pointer focus:border-primary"
          title="Zoom"
        >
          <option value="50">50%</option>
          <option value="75">75%</option>
          <option value="90">90%</option>
          <option value="100">100%</option>
          <option value="115">115%</option>
          <option value="125">125%</option>
          <option value="150">150%</option>
        </select>

        <div className="w-px h-4 bg-border" />

        {/* Font Select */}
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value)
            applyFormat('font', e.target.value)
          }}
          className="bg-card-sunken text-xs font-semibold px-2 py-1 rounded border border-border text-text cursor-pointer focus:border-primary"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        {/* Size Select */}
        <select
          value={fontSize}
          onChange={(e) => {
            setFontSize(e.target.value)
            applyFormat('size', e.target.value)
          }}
          className="bg-card-sunken text-xs font-semibold px-2 py-1 rounded border border-border text-text cursor-pointer focus:border-primary"
        >
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="w-px h-4 bg-border" />

        {/* Formatting actions */}
        <button
          type="button"
          onClick={() => applyFormat('bold')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary font-bold cursor-pointer"
          title="Bold"
          aria-label="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => applyFormat('italic')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary italic cursor-pointer"
          title="Italic"
          aria-label="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => applyFormat('underline')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary underline cursor-pointer"
          title="Underline"
          aria-label="Underline"
        >
          U
        </button>

        <div className="w-px h-4 bg-border" />

        {/* Highlighting */}
        <button
          type="button"
          onClick={() => applyFormat('background', '#fef08a')}
          className="p-1.5 hover:bg-primary/10 rounded text-amber-500 font-bold cursor-pointer"
          title="Highlight Yellow"
          aria-label="Highlight"
        >
          🖍️
        </button>

        {/* Colors */}
        <input
          type="color"
          value={textColor}
          onChange={(e) => {
            setTextColor(e.target.value)
            applyFormat('color', e.target.value)
          }}
          className="w-5 h-5 border-none p-0 cursor-pointer rounded-full overflow-hidden"
          title="Text Color"
          aria-label="Text color"
        />

        <div className="w-px h-4 bg-border" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => applyFormat('align', '')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary cursor-pointer"
          title="Align left"
          aria-label="Align left"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('align', 'center')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary cursor-pointer"
          title="Align center"
          aria-label="Align center"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('align', 'right')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary cursor-pointer"
          title="Align right"
          aria-label="Align right"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => applyFormat('list', 'bullet')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary cursor-pointer"
          title="Bullet list"
          aria-label="Bullet list"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => applyFormat('list', 'ordered')}
          className="p-1.5 hover:bg-primary/10 rounded text-muted hover:text-primary cursor-pointer"
          title="Numbered list"
          aria-label="Numbered list"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-border" />

        {/* Spacings */}
        <select
          value={lineSpacing}
          onChange={(e) => setLineSpacing(e.target.value)}
          className="bg-card-sunken text-xs font-semibold px-2 py-0.5 rounded border border-border text-text cursor-pointer focus:border-primary"
        >
          {LINE_SPACINGS.map((s) => (
            <option key={s} value={s}>
              {s} Space
            </option>
          ))}
        </select>

        {/* Clear formatting */}
        <button
          type="button"
          onClick={() => {
            const quill = quillRef?.current
            if (quill) {
              const range = quill.getSelection(true)
              if (range) quill.removeFormat(range.index, Math.max(range.length, 1))
              quill.focus()
            }
          }}
          className="px-2 py-1 bg-card hover:bg-danger/10 hover:text-danger rounded text-[10px] font-bold text-muted cursor-pointer ml-auto"
        >
          Clear Style
        </button>
      </div>

      {/* Editor Content Area + Collapsible Side Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Editor Page Layout */}
        <div
          className="flex-1 overflow-y-auto flex justify-center bg-card-sunken p-4 shadow-inner"
          ref={scrollContainerRef}
        >
          <div
            className="w-full bg-card shadow-card transition-all relative flex flex-col my-4 min-h-[1056px] h-max border border-border origin-top"
            style={{
              maxWidth: orientation === 'landscape' ? '1056px' : '816px',
              transform: `scale(${zoom / 100})`,
              marginBottom: `${(zoom / 100) * 1056 - 1056 + 16}px`
            }}
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div
              ref={mountElRef}
              className="flex-1 quill-editor-wrapper min-h-[400px] text-text p-8 outline-none"
              data-editor-ready={editorReady ? 'true' : 'false'}
            />
          </div>
        </div>

        {/* Collapsible sidebar panels */}
        {activeSidePanel === 'comments' && (
          <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 text-xs">
            <div className="p-4 border-b border-border flex items-center justify-between font-bold text-[10px] text-muted uppercase tracking-wider bg-card-sunken/50 shrink-0">
              <span>Comments Threads</span>
              <button onClick={() => setActiveSidePanel(null)} className="text-muted hover:text-text cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {ensureArray(comments).length === 0 ? (
                <p className="italic text-muted text-center py-6">No comment threads in this document.</p>
              ) : (
                ensureArray(comments).map((c) => (
                  <div key={c.id} className="bg-card-sunken border border-border/80 rounded-xl p-3 relative">
                    <button
                      onClick={() => handleDeleteComment(c.id)}
                      className="absolute top-2.5 right-2.5 p-1 hover:bg-danger/10 text-muted hover:text-danger rounded-md cursor-pointer"
                      title="Resolve Thread"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center justify-between text-[8px] font-bold text-muted mb-1">
                      <span>{c.user}</span>
                      <span>{c.timestamp}</span>
                    </div>
                    <p className="text-text leading-normal">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                className="flex-1 h-9 bg-card-sunken border border-border rounded-xl px-3 py-2 text-[11px] text-text placeholder:text-muted/65 focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleAddComment}
                className="px-3 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-xl text-[10px] font-bold cursor-pointer"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {activeSidePanel === 'versions' && (
          <div className="w-72 border-l border-border bg-card flex flex-col shrink-0 text-xs">
            <div className="p-4 border-b border-border flex items-center justify-between font-bold text-[10px] text-muted uppercase tracking-wider bg-card-sunken/50 shrink-0">
              <span>Version History</span>
              <button onClick={() => setActiveSidePanel(null)} className="text-muted hover:text-text cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {ensureArray(versions).length === 0 ? (
                <p className="italic text-muted text-center py-6">No saved history drafts.</p>
              ) : (
                ensureArray(versions).map((ver, i) => (
                  <div key={ver.versionId} className="bg-card-sunken border border-border/80 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-[8px] font-bold text-muted">
                      <span>Draft #{ensureArray(versions).length - i}</span>
                      <span>{ver.timestamp}</span>
                    </div>
                    <p className="text-[10px] text-muted/80 truncate">Saved by {ver.user}</p>
                    <button
                      onClick={() => onRevertVersion(ver)}
                      className="w-full py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-[9px] font-bold transition-all cursor-pointer border border-primary/20"
                    >
                      Restore Draft
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Metrics Status Bar */}
      <div className="h-6 border-t border-border bg-card px-4 flex items-center justify-between text-[9px] font-bold text-muted select-none shrink-0">
        <div className="flex items-center gap-3">
          <span>
            PAGE: {currentPage} of {stats.pages}
          </span>
          <span>WORDS: {stats.words}</span>
          <span>CHARACTERS: {stats.characters}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5 text-primary" /> READING TIME: ~{stats.readTime} MIN
          </span>
          <span>COLLABORATORS: {activeUsersCount}</span>
        </div>
      </div>
    </div>
  )
}
