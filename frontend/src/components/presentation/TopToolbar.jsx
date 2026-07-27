import { useRef } from 'react'
import toast from 'react-hot-toast'
import {
  Type,
  ImageIcon,
  Shapes,
  LayoutTemplate,
  Palette,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  MonitorPlay,
  PaintBucket,
  PenTool,
  Type as FontIcon,
  Group,
  Ungroup,
  BringToFront,
  SendToBack,
  ClipboardPaste,
  ClipboardCopy,
  Undo2,
  Redo2,
  Copy,
  Trash2,
  Star,
  Heart,
  Circle,
  Square,
  FolderUp,
  Sparkles, Download } from 'lucide-react'
import { listThemeCards } from './utils/slideThemes'
import api from '../../services/api'

const FONT_FAMILIES = [
  'Inter, sans-serif',
  'Arial, sans-serif',
  'Times New Roman, serif',
  'Courier New, monospace',
  'Georgia, serif'
]
const FONT_SIZES = ['12px', '14px', '16px', '18px', '24px', '32px', '48px', '64px', '72px']

const THEMES = listThemeCards()

const ICONS = [
  { icon: '★', label: 'Star' },
  { icon: '♥', label: 'Heart' },
  { icon: '●', label: 'Dot' },
  { icon: '▲', label: 'Triangle' },
  { icon: '◆', label: 'Diamond' },
  { icon: '✓', label: 'Check' },
  { icon: '→', label: 'Arrow' },
  { icon: '★', label: 'Star2' }
]

function ToolBtn({ onClick, title, children, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className="flex h-7 w-7 items-center justify-center rounded text-text hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export default function TopToolbar({
  activeTab,
  setActiveTab,
  onInsertElement,
  onFormatElement,
  onChangeTheme,
  onPresent,
  presentBusy = false,
  onPasteClipboard,
  onCopy,
  onDuplicate,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onDeleteSelection,
  hasSelection = false,
  onImportSlides,
  roomId,
  onAiAssistant,
  onExportPptx
}) {
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)
  const tabs = ['Home', 'Insert', 'Design', 'Transitions']

  const flushActiveEditor = () => {
    const node = document.activeElement
    if (node && node.isContentEditable) {
      node.dispatchEvent(new Event('input', { bubbles: true }))
      try {
        node.blur()
      } catch {
        // ignore
      }
    }
  }

  const flushEditorHtml = () => {
    queueMicrotask(() => {
      const node = document.activeElement
      if (node && node.isContentEditable) {
        node.dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
  }

  const handleFormatCommand = (command, formatKey, formatValue) => {
    const selection = window.getSelection()
    const isEditing = document.activeElement && document.activeElement.isContentEditable

    // Always update selected object style props (font/size/color live on the element)
    if (formatKey) {
      onFormatElement?.({ [formatKey]: formatValue })
    }

    if (isEditing || (selection && selection.rangeCount > 0 && !selection.isCollapsed)) {
      try {
        if (command === 'fontName' && formatValue) {
          document.execCommand('fontName', false, String(formatValue).split(',')[0].trim())
        } else if (command === 'fontSize' && formatValue) {
          // execCommand fontSize only accepts 1–7; map px → nearest step, then wrap with span for exact px
          const px = parseInt(formatValue, 10) || 16
          const step =
            px <= 12 ? '1' : px <= 14 ? '2' : px <= 16 ? '3' : px <= 18 ? '4' : px <= 24 ? '5' : px <= 32 ? '6' : '7'
          document.execCommand('fontSize', false, step)
          // Prefer exact size via CSS on selection if possible
          try {
            const sel = window.getSelection()
            if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
              document.execCommand('styleWithCSS', false, true)
              // re-apply size via fontSize is limited; object-level style is source of truth
            }
          } catch {
            // ignore
          }
        } else if (command) {
          document.execCommand(command, false, formatValue ?? null)
        }
      } catch {
        // ignore
      }
      flushEditorHtml()
    }
  }

  const handleNativeSelect = (e, formatKey) => {
    const value = e.target.value
    if (!value) return
    // Map toolbar selects to element props + optional contentEditable commands
    if (formatKey === 'fontFamily') {
      handleFormatCommand('fontName', 'fontFamily', value)
    } else if (formatKey === 'fontSize') {
      handleFormatCommand('fontSize', 'fontSize', value)
    } else {
      onFormatElement?.({ [formatKey]: value })
    }
    // reset select so same value can be re-picked later
    e.target.value = value
  }

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image must be under 12 MB')
      return
    }
    try {
      const { compressImageToDataUrl } = await import('./utils/compressImage')
      const { dataUrl, width, height } = await compressImageToDataUrl(file)
      const displayW = Math.min(360, width)
      const displayH = Math.round(displayW * (height / Math.max(1, width)))
      onInsertElement?.('image', {
        src: dataUrl,
        width: displayW,
        height: Math.max(80, displayH)
      })
      toast.success('Image inserted')
    } catch {
      toast.error('Could not process image')
    }
  }

  const handlePaste = async () => {
    if (onPasteClipboard) {
      onPasteClipboard()
      return
    }
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        onInsertElement?.('textbox', { text })
        toast.success('Pasted as text box')
      }
    } catch {
      toast.error('Clipboard paste is not available')
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    const ext = file.name.split('.').pop().toLowerCase()
    if (ext === 'json') {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = JSON.parse(evt.target.result)
          if (Array.isArray(data) && data.length > 0) {
            onImportSlides?.(data)
          } else {
            toast.error('Invalid slides JSON structure')
          }
        } catch {
          toast.error('Error parsing presentation JSON')
        }
      }
      reader.readAsText(file)
    } else if (ext === 'pptx') {
      if (!roomId) {
        toast.error('Cannot import PPTX without room information')
        return
      }
      const formData = new FormData()
      formData.append('file', file)

      const importToast = toast.loading('Importing presentation...')
      try {
        const { data } = await api.post(`/api/v1/workspaces/${roomId}/files/import`, formData)
        if (data.success && Array.isArray(data.slides)) {
          onImportSlides?.(data.slides)
          toast.success('Presentation imported!', { id: importToast })
        } else {
          toast.error(data.message || 'Failed to parse PPTX', { id: importToast })
        }
      } catch (err) {
        console.error('PPTX import error:', err)
        toast.error(err.response?.data?.message || 'Error connecting to import service', { id: importToast })
      }
    } else {
      toast.error('Please choose a .pptx or .json presentation file')
    }
  }

  return (
    <div className="relative z-10 flex shrink-0 flex-col border-b border-border bg-card shadow-sm">
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
      <input ref={fileInputRef} type="file" accept=".pptx,.json" className="hidden" onChange={handleImportFileChange} />

      <div className="flex items-center gap-1 bg-card-sunken/30 px-2 pt-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab.toLowerCase())}
            className={`rounded-t-md px-3 py-1.5 text-[13px] font-medium transition-colors sm:px-4 ${
              activeTab === tab.toLowerCase()
                ? 'border-b-2 border-primary bg-card text-primary shadow-sm'
                : 'bg-transparent text-muted hover:bg-muted/50 hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => onAiAssistant?.()}
          className="mr-2 mb-1 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:from-purple-600 hover:to-indigo-600 transition-all hover:scale-105"
        >
          <Sparkles className="w-3.5 h-3.5" />
          AI Assistant
        </button>

                <button
          type="button"
          onClick={onExportPptx}
          className="mb-1 mr-2 flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/25 px-3 py-1.5 text-[13px] font-semibold text-primary shadow-sm transition-all sm:px-4 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export PPTX</span>
        </button>

        <button
          type="button"
          onClick={onExportPptx}
          className="mb-1 mr-2 flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/25 px-3 py-1.5 text-[13px] font-semibold text-primary shadow-sm transition-all sm:px-4 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export PPTX</span>
        </button>

<button
          type="button"
          onClick={handleImportClick}
          className="mb-1 mr-2 flex items-center gap-1.5 rounded-md bg-primary/10 hover:bg-primary/20 border border-primary/25 px-3 py-1.5 text-[13px] font-semibold text-primary shadow-sm transition-all sm:px-4 cursor-pointer"
        >
          <FolderUp className="h-4 w-4" />
          <span>Import</span>
        </button>

        <button
          type="button"
          disabled={presentBusy}
          onClick={() => {
            flushActiveEditor()
            onPresent?.()
          }}
          className="mb-1 mr-2 flex items-center gap-1.5 rounded-md bg-[#b7472a] px-3 py-1.5 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[#a13b20] disabled:cursor-wait disabled:opacity-70 sm:px-4"
        >
          <MonitorPlay className="h-4 w-4" />
          <span>{presentBusy ? 'Syncing…' : 'Present'}</span>
        </button>
      </div>

      <div className="no-scrollbar flex h-[92px] items-start gap-3 overflow-x-auto bg-card px-2 py-2 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)] sm:gap-4 sm:px-3">
        {activeTab === 'home' && (
          <>
            {/* Clipboard + history */}
            <div className="flex h-full flex-col items-center gap-0.5 border-r border-border pr-3">
              <div className="flex items-center gap-0.5">
                <ToolBtn onClick={onUndo} title="Undo (Ctrl+Z)" disabled={!canUndo}>
                  <Undo2 className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn onClick={onRedo} title="Redo (Ctrl+Y)" disabled={!canRedo}>
                  <Redo2 className="h-4 w-4" />
                </ToolBtn>
              </div>
              <div className="mt-0.5 flex items-center gap-0.5">
                <ToolBtn onClick={handlePaste} title="Paste">
                  <ClipboardPaste className="h-4 w-4 text-primary" />
                </ToolBtn>
                <ToolBtn onClick={onCopy} title="Copy" disabled={!hasSelection}>
                  <ClipboardCopy className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn onClick={onDuplicate} title="Duplicate" disabled={!hasSelection}>
                  <Copy className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn onClick={onDeleteSelection} title="Delete" disabled={!hasSelection}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </ToolBtn>
              </div>
              <div className="mt-auto w-full text-center text-[10px] text-muted">Edit</div>
            </div>

            {/* Font */}
            <div
              className="flex h-full flex-col gap-1 border-r border-border pr-3"
              onMouseDown={(e) => {
                // Keep object selection when clicking toolbar (don't blur selection)
                if (e.target.tagName !== 'SELECT') e.preventDefault()
              }}
            >
              <div className="flex items-center gap-1">
                <select
                  onChange={(e) => handleNativeSelect(e, 'fontFamily')}
                  className="h-6 w-28 rounded border border-border bg-card px-1 text-xs text-text focus:outline-none sm:w-32"
                  defaultValue={FONT_FAMILIES[0]}
                  title="Font family"
                >
                  {FONT_FAMILIES.map((f) => (
                    <option key={f} value={f}>
                      {f.split(',')[0]}
                    </option>
                  ))}
                </select>
                <select
                  onChange={(e) => handleNativeSelect(e, 'fontSize')}
                  className="h-6 w-16 rounded border border-border bg-card px-1 text-xs text-text focus:outline-none"
                  defaultValue="24px"
                  title="Font size"
                >
                  {FONT_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mt-1 flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => handleFormatCommand('bold', 'fontWeight', 'bold')}
                  className="flex h-7 w-7 items-center justify-center rounded font-bold text-text hover:bg-muted/50"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatCommand('italic', 'fontStyle', 'italic')}
                  className="flex h-7 w-7 items-center justify-center rounded italic text-text hover:bg-muted/50"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => handleFormatCommand('underline', 'textDecoration', 'underline')}
                  className="flex h-7 w-7 items-center justify-center rounded text-text underline hover:bg-muted/50"
                >
                  U
                </button>
                <div className="mx-1 h-5 w-px bg-border" />
                <label
                  className="relative flex h-7 w-7 cursor-pointer flex-col items-center justify-center rounded hover:bg-muted/50"
                  title="Text Color"
                >
                  <FontIcon className="h-4 w-4 text-text" />
                  <div className="mt-[1px] h-1 w-4 rounded-full bg-red-500" />
                  <input
                    type="color"
                    className="absolute inset-0 cursor-pointer opacity-0"
                    onChange={(e) => handleFormatCommand('foreColor', 'color', e.target.value)}
                  />
                </label>
              </div>
              <div className="mt-auto w-full text-center text-[10px] text-muted">Font</div>
            </div>

            {/* Paragraph */}
            <div
              className="flex h-full flex-col gap-1 border-r border-border pr-3"
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="flex items-center gap-0.5">
                <ToolBtn
                  onClick={() => handleFormatCommand('insertUnorderedList', 'listStyle', 'disc')}
                  title="Bullets"
                >
                  <List className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  onClick={() => handleFormatCommand('insertOrderedList', 'listStyle', 'decimal')}
                  title="Numbering"
                >
                  <ListOrdered className="h-4 w-4" />
                </ToolBtn>
              </div>
              <div className="mt-1 flex items-center gap-0.5">
                <ToolBtn onClick={() => handleFormatCommand('justifyLeft', 'textAlign', 'left')} title="Align left">
                  <AlignLeft className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn
                  onClick={() => handleFormatCommand('justifyCenter', 'textAlign', 'center')}
                  title="Align center"
                >
                  <AlignCenter className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn onClick={() => handleFormatCommand('justifyRight', 'textAlign', 'right')} title="Align right">
                  <AlignRight className="h-4 w-4" />
                </ToolBtn>
                <ToolBtn onClick={() => handleFormatCommand('justifyFull', 'textAlign', 'justify')} title="Justify">
                  <AlignJustify className="h-4 w-4" />
                </ToolBtn>
              </div>
              <div className="mt-auto w-full text-center text-[10px] text-muted">Paragraph</div>
            </div>

            {/* Drawing */}
            <div className="flex h-full flex-col gap-1 border-r border-border pr-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onInsertElement?.('shape')}
                  className="flex h-12 w-12 flex-col items-center justify-center rounded text-text hover:bg-muted/50"
                  title="Insert rectangle"
                >
                  <Shapes className="h-6 w-6 text-primary" />
                </button>
                <div className="flex flex-col gap-1">
                  <label className="relative flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-xs hover:bg-muted/50">
                    <PaintBucket className="h-3.5 w-3.5 text-text" /> Fill
                    <input
                      type="color"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => onFormatElement?.({ fill: e.target.value })}
                    />
                  </label>
                  <label className="relative flex cursor-pointer items-center gap-1.5 rounded px-2 py-0.5 text-xs hover:bg-muted/50">
                    <PenTool className="h-3.5 w-3.5 text-text" /> Outline
                    <input
                      type="color"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) => onFormatElement?.({ borderColor: e.target.value, borderWidth: 2 })}
                    />
                  </label>
                </div>
              </div>
              <div className="mt-auto w-full text-center text-[10px] text-muted">Drawing</div>
            </div>

            {/* Arrange */}
            <div className="flex h-full flex-col gap-1 pr-2">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onFormatElement?.({ align: 'front' })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted/50"
                >
                  <BringToFront className="h-3.5 w-3.5" /> Front
                </button>
                <button
                  type="button"
                  onClick={() => onFormatElement?.({ align: 'back' })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted/50"
                >
                  <SendToBack className="h-3.5 w-3.5" /> Back
                </button>
              </div>
              <div className="mt-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onFormatElement?.({ group: true })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted/50"
                >
                  <Group className="h-3.5 w-3.5" /> Group
                </button>
                <button
                  type="button"
                  onClick={() => onFormatElement?.({ ungroup: true })}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-muted/50"
                >
                  <Ungroup className="h-3.5 w-3.5" /> Ungroup
                </button>
              </div>
              <div className="mt-auto w-full text-center text-[10px] text-muted">Arrange</div>
            </div>
          </>
        )}

        {activeTab === 'insert' && (
          <div className="flex h-full items-start gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onInsertElement?.('textbox')}
              className="flex h-16 w-14 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-16"
            >
              <Type className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">Text</span>
            </button>
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="flex h-16 w-14 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-16"
            >
              <ImageIcon className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">Picture</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertElement?.('shape', { shape: 'rect' })}
              className="flex h-16 w-14 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-16"
            >
              <Square className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">Rect</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertElement?.('shape', { shape: 'circle', borderRadius: 9999 })}
              className="flex h-16 w-14 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-16"
            >
              <Circle className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">Circle</span>
            </button>
            <button
              type="button"
              onClick={() =>
                onInsertElement?.('shape', {
                  shape: 'rounded',
                  borderRadius: 24,
                  fill: '#dbeafe',
                  text: 'Shape text'
                })
              }
              className="flex h-16 w-14 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-16"
            >
              <Shapes className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">Round</span>
            </button>
            {ICONS.slice(0, 4).map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onInsertElement?.('icon', { icon: item.icon })}
                className="flex h-16 w-12 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-14"
                title={item.label}
              >
                <span className="mb-1 text-xl leading-none">{item.icon}</span>
                <span className="text-[10px]">{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => onInsertElement?.('icon', { icon: '★', fill: '#fef3c7' })}
              className="flex h-16 w-12 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-14"
            >
              <Star className="mb-1 h-5 w-5 text-amber-500" />
              <span className="text-[10px]">Star</span>
            </button>
            <button
              type="button"
              onClick={() => onInsertElement?.('icon', { icon: '♥', fill: '#fee2e2' })}
              className="flex h-16 w-12 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50 sm:w-14"
            >
              <Heart className="mb-1 h-5 w-5 text-rose-500" />
              <span className="text-[10px]">Heart</span>
            </button>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="flex h-full items-start gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onChangeTheme?.(t.id)
                  toast.success(`Theme: ${t.label}`)
                }}
                className="flex h-16 w-16 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50"
                title={t.label}
              >
                <div className={`mb-1 h-8 w-12 rounded border border-border bg-gradient-to-br ${t.gradient}`} />
                <span className="text-[10px]">{t.label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => toast('Standard 16:9 widescreen slide', { icon: '📐' })}
              className="flex h-16 w-16 flex-col items-center justify-center rounded text-text transition-colors hover:bg-muted/50"
            >
              <LayoutTemplate className="mb-1 h-6 w-6 text-primary" />
              <span className="text-[11px]">16:9</span>
            </button>
          </div>
        )}

        {activeTab === 'transitions' && (
          <div className="flex h-full items-center gap-3 text-sm text-muted">
            <Palette className="h-5 w-5 text-primary" />
            <span>Click Present for full-screen transitions. Fade is applied between slides.</span>
          </div>
        )}
      </div>
    </div>
  )
}
