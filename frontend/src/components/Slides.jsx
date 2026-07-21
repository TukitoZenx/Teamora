import React, { useState, useEffect, useMemo, useRef } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  Presentation,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  StickyNote,
  Download,
  Image as ImageIcon,
  Video,
  Table2,
  Shapes,
  Upload,
  Eye,
  EyeOff,
  FolderInput,
  Type,
  Cloud,
  MonitorPlay,
  Settings2,
  Minus,
  Undo2,
  Redo2,
  Share2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  AlertTriangle,
  Italic,
  Underline,
  Palette,
  ChevronDown,
  AlignJustify,
  Strikethrough,
  Highlighter,
  RemoveFormatting,
  List,
  ListOrdered,
  Paintbrush,
  ArrowUpDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { importPptxToSlides } from '../services/pptxImport'

const SLIDE_THEMES = [
  {
    id: 'default',
    label: 'Clean',
    gradient: 'from-white to-slate-50 dark:from-slate-900 dark:to-slate-900',
    accent: 'from-amber-500 to-orange-500'
  },
  {
    id: 'ocean',
    label: 'Ocean',
    gradient: 'from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950',
    accent: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'sunset',
    label: 'Sunset',
    gradient: 'from-rose-50 to-amber-50 dark:from-rose-950 dark:to-amber-950',
    accent: 'from-rose-500 to-amber-500'
  },
  {
    id: 'forest',
    label: 'Forest',
    gradient: 'from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950',
    accent: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'purple',
    label: 'Cosmos',
    gradient: 'from-violet-50 to-indigo-50 dark:from-violet-950 dark:to-indigo-950',
    accent: 'from-violet-500 to-indigo-500'
  }
]

const SlideObject = ({ el, isSelected, onSelect, onDrag, onDelete, externalIsEditing, onSetEditing, children }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (externalIsEditing !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(externalIsEditing)
    }
  }, [externalIsEditing])

  useEffect(() => {
    if (!isSelected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsEditing(false)
      if (onSetEditing) onSetEditing(false)
    }
  }, [isSelected, onSetEditing])

  useEffect(() => {
    if (!isEditing) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsEditing(false)
        if (onSetEditing) onSetEditing(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEditing, onSetEditing])

  const handleDoubleClick = (e) => {
    e.stopPropagation()
    setIsEditing(true)
    if (onSetEditing) onSetEditing(true)
  }

  const handleMouseDown = (e) => {
    if (!isEditing) {
      e.stopPropagation()
      onSelect(el.id)
      onDrag(e, el, 'move')
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      style={{
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        zIndex: isSelected ? 40 : el.zIndex || 10,
        transform: `rotate(${el.rotation || 0}deg)`,
        background: el.type === 'textbox' || el.type === 'shape' ? el.fill || 'transparent' : undefined,
        borderColor: el.borderWidth ? el.borderColor || el.color : 'transparent',
        opacity: el.opacity ?? 1,
        boxShadow: el.shadow || 'none',
        borderRadius: el.borderRadius ? `${el.borderRadius}px` : el.type === 'shape' ? '9999px' : '0px',
        borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
        borderStyle: el.borderWidth ? 'solid' : 'none',
        cursor: isEditing ? 'text' : 'move'
      }}
      className={`relative transition-shadow duration-150 ${isEditing ? 'select-text' : 'select-none'} ${
        isSelected ? '' : isHovered ? 'shadow-[0_0_0_1px_rgba(124,58,237,0.4)]' : ''
      }`}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child, { isEditing })
        }
        return child
      })}

      {/* Accent-Colored Selection Bounding Box Outline */}
      {isSelected && <div className="absolute inset-0 pointer-events-none border-2 border-primary z-40 animate-none" />}

      {/* Delete (X) Button */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (onDelete) onDelete(el.id)
          }}
          className="absolute -top-3.5 -right-3.5 bg-white dark:bg-slate-900 hover:bg-red-500 hover:text-white text-slate-500 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-md z-[70] transition-colors"
          title="Delete"
        >
          <X className="w-3 h-3" />
        </button>
      )}

      {/* Draggable Borders (Hotzones) */}
      {isSelected && (
        <>
          <div
            className="absolute -top-1 inset-x-0 h-2 cursor-move bg-transparent z-40"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'move')
            }}
          />
          <div
            className="absolute -bottom-1 inset-x-0 h-2 cursor-move bg-transparent z-40"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'move')
            }}
          />
          <div
            className="absolute -left-1 inset-y-0 w-2 cursor-move bg-transparent z-40"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'move')
            }}
          />
          <div
            className="absolute -right-1 inset-y-0 w-2 cursor-move bg-transparent z-40"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'move')
            }}
          />
        </>
      )}

      {/* 8 Resize Handles and Rotate Handle (Slightly larger, crisp handles) */}
      {isSelected && !isEditing && (
        <>
          {/* Corner Resize Handles */}
          <div
            className="absolute -top-[5px] -left-[5px] w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-nwse-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-nw')
            }}
          />
          <div
            className="absolute -top-[5px] -right-[5px] w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-nesw-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-ne')
            }}
          />
          <div
            className="absolute -bottom-[5px] -right-[5px] w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-nwse-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-se')
            }}
          />
          <div
            className="absolute -bottom-[5px] -left-[5px] w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-nesw-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-sw')
            }}
          />

          {/* Edge Resize Handles */}
          <div
            className="absolute -top-[5px] left-1/2 -translate-x-1/2 w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-ns-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-n')
            }}
          />
          <div
            className="absolute top-1/2 -right-[5px] -translate-y-1/2 w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-ew-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-e')
            }}
          />
          <div
            className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-ns-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-s')
            }}
          />
          <div
            className="absolute top-1/2 -left-[5px] -translate-y-1/2 w-[9px] h-[9px] bg-white border border-primary shadow-sm cursor-ew-resize z-50 hover:bg-primary/10 transition-colors"
            onMouseDown={(e) => {
              e.stopPropagation()
              onDrag(e, el, 'resize-w')
            }}
          />

          {/* Rotate Handle */}
          <div className="absolute -top-[24px] left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div
              className="w-2.5 h-2.5 cursor-grab rounded-full bg-white border border-primary shadow-sm z-50 flex items-center justify-center hover:bg-primary hover:border-primary transition-colors"
              onMouseDown={(e) => {
                e.stopPropagation()
                onDrag(e, el, 'rotate')
              }}
            />
            <div className="w-px h-[14px] bg-primary/40 pointer-events-none" />
          </div>
        </>
      )}
    </div>
  )
}

const TextEditor = ({ el, patchElement, isEditing, onDuplicateToNextSlide }) => {
  const contentRef = useRef(null)
  const [isOverflowing, setIsOverflowing] = useState(false)

  const checkOverflow = () => {
    if (!contentRef.current) return
    const { scrollHeight, clientHeight } = contentRef.current
    setIsOverflowing(scrollHeight > clientHeight + 2)
  }

  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      if (contentRef.current.innerText !== (el.text || '')) {
        contentRef.current.innerText = el.text || ''
      }
    }
    checkOverflow()
  }, [el.text, el.height, el.width, el.fontSize])

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus()
    }
  }, [isEditing])

  const handleInput = (e) => {
    patchElement(el.id, { text: e.target.innerText })
    checkOverflow()
  }

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
      e.preventDefault()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }

  const handleAutoFit = (e) => {
    e.stopPropagation()
    let newSize = parseInt(el.fontSize || '16', 10)
    let currentHeight = contentRef.current.scrollHeight
    const clientHeight = contentRef.current.clientHeight
    while (currentHeight > clientHeight && newSize > 8) {
      newSize -= 1
      contentRef.current.style.fontSize = `${newSize}px`
      currentHeight = contentRef.current.scrollHeight
    }
    patchElement(el.id, { fontSize: `${newSize}px` })
  }

  const handleResizeBox = (e) => {
    e.stopPropagation()
    patchElement(el.id, { height: contentRef.current.scrollHeight })
  }

  const handleContinue = (e) => {
    e.stopPropagation()
    onDuplicateToNextSlide(el)
  }

  return (
    <>
      <div
        ref={contentRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onInput={handleInput}
        onBlur={checkOverflow}
        onKeyDown={handleKeyDown}
        onMouseDown={(e) => {
          if (!isEditing) e.preventDefault()
        }}
        className="w-full h-full p-2 outline-none whitespace-pre-wrap break-words overflow-hidden"
        style={{
          fontFamily: el.fontFamily || 'Inter, sans-serif',
          fontSize: el.fontSize || '16px',
          fontWeight: el.fontWeight || 'normal',
          fontStyle: el.fontStyle || 'normal',
          color: el.color || '#000000',
          textAlign: el.textAlign || 'left',
          textDecoration: el.textDecoration || 'none',
          lineHeight: el.lineHeight || '1.2',
          letterSpacing: el.letterSpacing || 'normal',
          userSelect: isEditing ? 'text' : 'none'
        }}
      />
      {isOverflowing && !isEditing && (
        <div className="absolute -bottom-6 left-0 bg-red-500 text-white text-[10px] px-2 py-1 rounded shadow cursor-pointer z-50 flex items-center gap-1 group">
          <AlertTriangle className="w-3 h-3" /> Overflow
          <div className="absolute left-0 top-full mt-1 hidden group-hover:block bg-white dark:bg-slate-800 rounded shadow-lg border border-border w-40">
            <button
              onMouseDown={handleAutoFit}
              className="w-full text-xs text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Auto-fit text
            </button>
            <button
              onMouseDown={handleResizeBox}
              className="w-full text-xs text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Resize box
            </button>
            <button
              onMouseDown={handleContinue}
              className="w-full text-xs text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
            >
              Continue next slide
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default function Slides({
  slides = [],
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  addSlide,
  handleSlideUpdate,
  roomId,
  socket,
  activeUsers = [],
  setSlides,
  activeFileId,
  filesList = []
}) {
  const [showNotes, setShowNotes] = useState(true)
  const [selectedTheme, setSelectedTheme] = useState('default')

  const [transitionEffect, setTransitionEffect] = useState('fade')
  const [zoom, setZoom] = useState(100)
  const showRightPanel = false
  const [activeRibbonTab, setActiveRibbonTab] = useState('home')

  // Multiplayer Live Cursors
  const [liveCursors, setLiveCursors] = useState({})
  const lastCursorEmitRef = useRef(0)
  const [myCursorInfo] = useState(() => {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8', '#c084fc', '#f472b6']
    return {
      color: colors[Math.floor(Math.random() * colors.length)],
      name: `Guest ${Math.floor(Math.random() * 1000)}`
    }
  })

  useEffect(() => {
    if (!socket) return
    const handleCursorMove = (data) => {
      if (data.senderSocketId === socket.id) return
      setLiveCursors((prev) => {
        if (data.x === null) {
          const next = { ...prev }
          delete next[data.senderSocketId]
          return next
        }
        return {
          ...prev,
          [data.senderSocketId]: { ...data, updatedAt: Date.now() }
        }
      })
    }
    socket.on('receive-cursor-move', handleCursorMove)
    return () => socket.off('receive-cursor-move', handleCursorMove)
  }, [socket])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      setLiveCursors((prev) => {
        const next = { ...prev }
        let changed = false
        for (const [id, cursor] of Object.entries(next)) {
          if (now - cursor.updatedAt > 5000) {
            delete next[id]
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleCanvasMouseMove = (e) => {
    if (!socket) return
    const now = Date.now()
    if (now - lastCursorEmitRef.current < 50) return
    lastCursorEmitRef.current = now

    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / (zoom / 100)
    const y = (e.clientY - rect.top) / (zoom / 100)

    socket.emit('cursor-move', { x, y, name: myCursorInfo.name, color: myCursorInfo.color })
  }

  // Elements toolbar / states
  const [selectedElemId, setSelectedElemId] = useState(null)
  const [editingElemId, setEditingElemId] = useState(null)
  const [activeDropdown, setActiveDropdown] = useState(null) // 'font' | 'size' | 'color' | 'highlight' | 'spacing' | 'more' | null
  const [activeTool, setActiveTool] = useState(null)
  const [creationRect, setCreationRect] = useState(null)
  const [dragSlideIndex, setDragSlideIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)
  const dragIndexRef = useRef(null)

  // Copy/Paste Clipboards
  const [copiedSlide, setCopiedSlide] = useState(null)
  const [copiedElement, setCopiedElement] = useState(null)

  // Undo/Redo State History
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const isHistoryUpdate = useRef(false)

  // Track slide list changes to maintain undo stack
  useEffect(() => {
    if (slides && slides.length > 0) {
      if (isHistoryUpdate.current) {
        isHistoryUpdate.current = false
        return
      }
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1)
        const lastState = next[next.length - 1]
        if (JSON.stringify(lastState) !== JSON.stringify(slides)) {
          const updated = [...next, JSON.parse(JSON.stringify(slides))]
          setHistoryIndex(updated.length - 1)
          return updated
        }
        return prev
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides])

  const undo = () => {
    if (historyIndex > 0) {
      isHistoryUpdate.current = true
      const prevIndex = historyIndex - 1
      const prevState = history[prevIndex]
      setHistoryIndex(prevIndex)
      setSlides(prevState)
      if (socket && roomId) {
        socket.emit('update-slides', { roomId, slides: prevState })
      }
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      isHistoryUpdate.current = true
      const nextIndex = historyIndex + 1
      const nextState = history[nextIndex]
      setHistoryIndex(nextIndex)
      setSlides(nextState)
      if (socket && roomId) {
        socket.emit('update-slides', { roomId, slides: nextState })
      }
    }
  }

  const theme = SLIDE_THEMES.find((t) => t.id === selectedTheme) || SLIDE_THEMES[0]

  const visibleSlideIndexes = useMemo(
    () =>
      ensureArray(slides)
        .map((s, i) => ({ s, i }))
        .filter(({ s }) => !s?.hidden)
        .map(({ i }) => i),
    [slides]
  )

  // Dynamic slides load from active file content
  useEffect(() => {
    if (activeFileId && filesList && filesList.length > 0) {
      const file = filesList.find((f) => f.id === activeFileId)
      if (file && file.content) {
        if (Array.isArray(file.content)) {
          setSlides(file.content)
        } else {
          console.warn('Warning: loaded slide content is not an array:', file.content)
          setSlides([
            {
              title: 'Click to add title',
              content: 'Click to add text',
              notes: '',
              elements: [],
              layout: 'title'
            }
          ])
        }
      } else {
        setSlides([
          {
            title: 'Click to add title',
            content: 'Click to add text',
            notes: '',
            elements: [],
            layout: 'title'
          }
        ])
      }
    }
  }, [activeFileId, filesList, setSlides])

  // Slide list ownership lives in PresentationSection (Yjs / props).
  // Do not re-apply receive-slides-list via setSlides — that re-emits and loops.

  const nextVisibleIndex = (from, dir = 1) => {
    let i = from + dir
    while (i >= 0 && i < slides.length) {
      if (!slides[i]?.hidden) return i
      i += dir
    }
    return from
  }

  const activeSlideData = slides[activeSlide] ||
    slides[0] || { title: '', content: '', notes: '', elements: [], layout: 'title' }
  const slideElements = activeSlideData.elements || []

  const handleDuplicateSlide = (index = activeSlide) => {
    const slideToDuplicate = slides[index]
    if (!slideToDuplicate) return
    const newSlides = [...slides]
    newSlides.splice(index + 1, 0, {
      id: `slide-${Math.random().toString(36).slice(2, 10)}`,
      title: slideToDuplicate.title,
      content: slideToDuplicate.content,
      notes: slideToDuplicate.notes || '',
      layout: slideToDuplicate.layout || 'title',
      elements: slideToDuplicate.elements
        ? slideToDuplicate.elements.map((el) => ({
            ...el,
            id: el?.id
              ? `${el.id}-copy-${Math.random().toString(36).slice(2, 6)}`
              : `elem-${Math.random().toString(36).slice(2, 9)}`
          }))
        : []
    })
    setSlides(newSlides)
    setActiveSlide(index + 1)
    socket.emit('change-slide', { roomId, slideIndex: index + 1 })
    toast.success('Slide duplicated')
  }

  const handleOverflowToNextSlide = (elem) => {
    const text = elem.text || ''
    // Simple heuristic: split text at roughly halfway, on a space.
    let half = Math.floor(text.length / 2)
    while (half < text.length && text[half] !== ' ' && text[half] !== '\n') {
      half++
    }
    const firstHalf = text.substring(0, half).trim()
    const secondHalf = text.substring(half).trim()

    // Update current element text
    patchElement(elem.id, { text: firstHalf })

    // Duplicate slide and modify element in the new slide
    const slideToDuplicate = activeSlideData
    const newSlides = [...slides]

    newSlides.splice(activeSlide + 1, 0, {
      // eslint-disable-next-line react-hooks/purity
      id: `slide-${Date.now().toString(36)}-${Math.floor(Date.now() / 1000)}`,
      title: slideToDuplicate.title,
      content: slideToDuplicate.content,
      notes: slideToDuplicate.notes || '',
      layout: slideToDuplicate.layout || 'title',
      elements: slideToDuplicate.elements
        ? slideToDuplicate.elements.map((el, idx) => {
            if (el.id === elem.id) {
              return { ...el, id: `elem-${Date.now().toString(36)}-${idx}`, text: secondHalf }
            }

            return { ...el, id: `${el.id}-copy-${Date.now().toString(36)}-${idx}` }
          })
        : []
    })
    setSlides(newSlides)
    setActiveSlide(activeSlide + 1)
    socket.emit('change-slide', { roomId, slideIndex: activeSlide + 1 })
    toast.success('Overflow moved to next slide')
  }

  const handleDeleteSlide = (indexToDelete = activeSlide) => {
    if (slides.length <= 1) {
      toast.error('Cannot delete the last slide')
      return
    }
    const newSlides = slides.filter((_, i) => i !== indexToDelete)
    const newActive =
      indexToDelete === activeSlide
        ? Math.max(0, activeSlide - 1)
        : activeSlide >= newSlides.length
          ? newSlides.length - 1
          : activeSlide
    setSlides(newSlides)
    setActiveSlide(newActive)
    socket.emit('change-slide', { roomId, slideIndex: newActive })
    toast.success('Slide deleted')
  }

  const handleRenameSlide = (index) => {
    const currentTitle = slides[index]?.title || ''
    const newTitle = window.prompt('Rename Slide:', currentTitle)
    if (newTitle !== null) {
      const newSlides = [...slides]
      newSlides[index] = { ...newSlides[index], title: newTitle }
      setSlides(newSlides)
      if (socket && roomId) {
        socket.emit('update-slides', { roomId, slides: newSlides })
      }
      toast.success('Slide renamed')
    }
  }

  const handleCopySlide = (index) => {
    setCopiedSlide(JSON.parse(JSON.stringify(slides[index])))
    toast.success('Slide copied to clipboard')
  }

  const reorderSlide = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= slides.length || toIndex >= slides.length) return
    const newSlides = [...slides]
    const [moved] = newSlides.splice(fromIndex, 1)
    newSlides.splice(toIndex, 0, moved)
    setSlides(newSlides)
    setActiveSlide(toIndex)
    socket.emit('change-slide', { roomId, slideIndex: toIndex })
  }

  const toggleHideSlide = (index) => {
    const slide = slides[index]
    if (!slide) return
    const next = slides.map((s, i) => (i === index ? { ...s, hidden: !s.hidden } : s))
    // Don't hide last visible slide
    const visibleCount = next.filter((s) => !s.hidden).length
    if (visibleCount === 0) {
      toast.error('At least one slide must remain visible')
      return
    }
    setSlides(next)
    toast.success(next[index].hidden ? 'Slide hidden from slideshow' : 'Slide visible in slideshow')
  }

  const onThumbDragStart = (index, e) => {
    dragIndexRef.current = index
    setDragSlideIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const onThumbDragOver = (index, e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetIndex(index)
  }

  const onThumbDrop = (index, e) => {
    e.preventDefault()
    const from = dragIndexRef.current ?? parseInt(e.dataTransfer.getData('text/plain'), 10)
    setDragSlideIndex(null)
    setDropTargetIndex(null)
    dragIndexRef.current = null
    if (Number.isFinite(from)) reorderSlide(from, index)
  }

  const onThumbDragEnd = () => {
    setDragSlideIndex(null)
    setDropTargetIndex(null)
    dragIndexRef.current = null
  }

  // Slides Inserts
  const addElementToSlide = (type) => {
    let sourceVal = ''
    if (type === 'image') {
      sourceVal = prompt('Enter Image URL:', 'https://picsum.photos/400/300')
      if (!sourceVal) return
    } else if (type === 'video') {
      sourceVal = prompt('Enter Video link (YouTube embed URL):', 'https://www.youtube.com/embed/dQw4w9WgXcQ')
      if (!sourceVal) return
    }

    const newElement = {
      id: 'elem-' + Math.random().toString(36).substring(7),
      type,
      x: 100,
      y: 150,
      width: type === 'image' || type === 'video' ? 320 : type === 'table' ? 300 : 150,
      height: type === 'image' || type === 'video' ? 180 : type === 'table' ? 120 : 100,
      src: sourceVal,
      color: '#6366f1'
    }

    const currentElems = activeSlideData.elements || []
    handleSlideUpdate('elements', [...currentElems, newElement])
    setSelectedElemId(newElement.id)
    toast.success(`Inserted ${type} element!`)
  }

  const deleteElement = (elemId) => {
    const currentElems = activeSlideData.elements || []
    const updated = currentElems.filter((el) => el.id !== elemId)
    handleSlideUpdate('elements', updated)
    setSelectedElemId(null)
  }

  const patchElement = (elemId, patch) => {
    const currentElems = activeSlideData.elements || []
    handleSlideUpdate(
      'elements',
      currentElems.map((el) => (el.id === elemId ? { ...el, ...patch } : el))
    )
  }

  const handleElementDrag = (e, elem, mode = 'move') => {
    e.stopPropagation()
    e.preventDefault()
    setSelectedElemId(elem.id)
    const startX = e.clientX
    const startY = e.clientY
    const origin = {
      x: elem.x,
      y: elem.y,
      width: elem.width,
      height: elem.height,
      rotation: elem.rotation || 0,
      zIndex: elem.zIndex || 10
    }

    const scale = zoom / 100

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / scale
      const dy = (moveEvent.clientY - startY) / scale

      if (mode === 'move') {
        patchElement(elem.id, { x: Math.max(0, Math.round(origin.x + dx)), y: Math.max(0, Math.round(origin.y + dy)) })
      } else if (mode === 'rotate') {
        patchElement(elem.id, { rotation: Math.round(origin.rotation + dx) })
      } else {
        let width = origin.width
        let height = origin.height
        let x = origin.x
        let y = origin.y

        if (mode.includes('e')) {
          width = Math.max(20, Math.round(origin.width + dx))
        }
        if (mode.includes('w')) {
          const nextWidth = Math.max(20, Math.round(origin.width - dx))
          x = origin.x + (origin.width - nextWidth)
          width = nextWidth
        }
        if (mode.includes('s')) {
          height = Math.max(20, Math.round(origin.height + dy))
        }
        if (mode.includes('n')) {
          const nextHeight = Math.max(20, Math.round(origin.height - dy))
          y = origin.y + (origin.height - nextHeight)
          height = nextHeight
        }

        patchElement(elem.id, { x, y, width, height })
      }
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const addTextBoxToSlide = () => {
    setActiveTool((prev) => (prev === 'textbox' ? null : 'textbox'))
  }

  const handleCanvasMouseDown = (e) => {
    if (activeTool !== 'textbox') {
      setSelectedElemId(null)
      setEditingElemId(null)
      return
    }
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = zoom / 100
    const startX = (e.clientX - rect.left) / scale
    const startY = (e.clientY - rect.top) / scale

    setCreationRect({
      x: startX,
      y: startY,
      width: 0,
      height: 0
    })

    const handleMouseMove = (moveEvent) => {
      const currentX = (moveEvent.clientX - rect.left) / scale
      const currentY = (moveEvent.clientY - rect.top) / scale

      const x = Math.min(startX, currentX)
      const y = Math.min(startY, currentY)
      const width = Math.abs(currentX - startX)
      const height = Math.abs(currentY - startY)

      setCreationRect({ x, y, width, height })
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      setCreationRect((prev) => {
        if (prev && prev.width > 5 && prev.height > 5) {
          const newElement = {
            id: 'elem-' + Math.random().toString(36).substring(7),
            type: 'textbox',
            x: Math.round(prev.x),
            y: Math.round(prev.y),
            width: Math.round(prev.width),
            height: Math.round(prev.height),
            rotation: 0,
            zIndex: 20,
            text: '',
            color: '#000000',
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif',
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'left',
            fill: 'rgba(255,255,255,0)',
            borderColor: 'transparent',
            borderWidth: 0
          }
          const updatedElements = [...(activeSlideData.elements || []), newElement]
          handleSlideUpdate('elements', updatedElements)

          setSelectedElemId(newElement.id)
          setEditingElemId(newElement.id)
          toast.success('Text box created')
        }
        return null
      })
      setActiveTool(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // Keyboard navigation for presentation (skips hidden slides)
  useEffect(() => {
    const step = (from, dir) => {
      let i = from + dir
      while (i >= 0 && i < slides.length) {
        if (!slides[i]?.hidden) return i
        i += dir
      }
      return from
    }
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input/textarea or contentEditable
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return

      if (isPresenting) {
        if (e.key === 'Escape') {
          setIsPresenting(false)
        } else if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) {
          if (e.key === ' ' && e.shiftKey) {
            e.preventDefault()
            const prevIndex = step(activeSlide, -1)
            setActiveSlide(prevIndex)
            socket.emit('change-slide', { roomId, slideIndex: prevIndex })
          } else {
            e.preventDefault()
            const nextIndex = step(activeSlide, 1)
            setActiveSlide(nextIndex)
            socket.emit('change-slide', { roomId, slideIndex: nextIndex })
          }
        } else if (['ArrowLeft', 'PageUp'].includes(e.key)) {
          e.preventDefault()
          const prevIndex = step(activeSlide, -1)
          setActiveSlide(prevIndex)
          socket.emit('change-slide', { roomId, slideIndex: prevIndex })
        } else if (e.key === 'Home') {
          e.preventDefault()
          const first = ensureArray(slides).findIndex((s) => !s?.hidden)
          if (first >= 0) {
            setActiveSlide(first)
            socket.emit('change-slide', { roomId, slideIndex: first })
          }
        } else if (e.key === 'End') {
          e.preventDefault()
          const visible = ensureArray(slides)
            .map((s, i) => (!s?.hidden ? i : -1))
            .filter((i) => i !== -1)
          if (visible.length) {
            const last = visible[visible.length - 1]
            setActiveSlide(last)
            socket.emit('change-slide', { roomId, slideIndex: last })
          }
        } else if (e.key === 'F5') {
          e.preventDefault()
        }
      } else {
        // Canvas Editor Shortcuts
        if (e.ctrlKey || e.metaKey) {
          const key = e.key.toLowerCase()
          if (key === 'c') {
            if (selectedElemId) {
              e.preventDefault()
              const elem = activeSlideData.elements?.find((el) => el.id === selectedElemId)
              if (elem) {
                setCopiedElement(JSON.parse(JSON.stringify(elem)))
                toast.success('Element copied')
              }
            } else {
              e.preventDefault()
              setCopiedSlide(JSON.parse(JSON.stringify(activeSlideData)))
              toast.success('Slide copied')
            }
          } else if (key === 'v') {
            if (copiedElement) {
              e.preventDefault()
              const pasted = {
                ...copiedElement,
                id: 'elem-' + Math.random().toString(36).substring(7),
                x: copiedElement.x + 20,
                y: copiedElement.y + 20
              }
              handleSlideUpdate('elements', [...(activeSlideData.elements || []), pasted])
              setSelectedElemId(pasted.id)
              toast.success('Element pasted')
            } else if (copiedSlide) {
              e.preventDefault()
              const duplicatedSlide = {
                ...copiedSlide,
                id: `slide-${Math.random().toString(36).slice(2, 10)}`,
                elements: copiedSlide.elements
                  ? copiedSlide.elements.map((el, idx) => ({
                      ...el,
                      id: `${el.id}-copy-${Date.now().toString(36)}-${idx}`
                    }))
                  : []
              }
              const newSlides = [...slides]
              newSlides.splice(activeSlide + 1, 0, duplicatedSlide)
              setSlides(newSlides)
              setActiveSlide(activeSlide + 1)
              socket.emit('change-slide', { roomId, slideIndex: activeSlide + 1 })
              toast.success('Slide pasted')
            }
          } else if (key === 'z') {
            e.preventDefault()
            undo()
          } else if (key === 'y') {
            e.preventDefault()
            redo()
          }
        } else {
          if (e.key === 'F5') {
            e.preventDefault()
            const first = ensureArray(slides).findIndex((s) => !s?.hidden)
            if (first >= 0) setActiveSlide(first)
            setIsPresenting(true)
          } else if (e.key === 'Enter' && selectedElemId && !editingElemId) {
            e.preventDefault()
            setEditingElemId(selectedElemId)
          } else if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedElemId) {
              e.preventDefault()
              deleteElement(selectedElemId)
            } else {
              e.preventDefault()
              handleDeleteSlide(activeSlide)
            }
          } else if (e.key === 'Escape') {
            if (selectedElemId) {
              e.preventDefault()
              setSelectedElemId(null)
            }
          } else if (e.key.toLowerCase() === 'v') {
            e.preventDefault()
            setSelectedElemId(null)
          } else if (e.key.toLowerCase() === 't') {
            e.preventDefault()
            addTextBoxToSlide()
          } else if (e.key.toLowerCase() === 'r') {
            e.preventDefault()
            addElementToSlide('shape')
          } else if (e.key.toLowerCase() === 'i') {
            e.preventDefault()
            addElementToSlide('image')
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isPresenting,
    activeSlide,
    slides,
    roomId,
    socket,
    setActiveSlide,
    setIsPresenting,
    selectedElemId,
    addTextBoxToSlide,
    deleteElement,
    addElementToSlide,
    copiedElement,
    copiedSlide,
    activeSlideData,
    handleDeleteSlide,
    handleSlideUpdate,
    setSlides,
    undo,
    redo
  ])

  /** PPTX import via JSZip — text, notes, and embedded images. */
  const handleImportPptx = async (file) => {
    if (!file) return
    const loading = toast.loading('Importing PPTX…')
    try {
      const { slides: imported, warnings } = await importPptxToSlides(file)
      if (!imported.length) {
        toast.error(warnings[0] || 'No slides found in file', { id: loading })
        return
      }
      setSlides(imported)
      setActiveSlide(0)
      const imgCount = imported.reduce((n, s) => n + (s.elements || []).filter((e) => e.type === 'image').length, 0)
      toast.success(`Imported ${imported.length} slide(s)${imgCount ? ` · ${imgCount} image(s)` : ''}`, { id: loading })
      if (warnings.length) console.warn('[pptxImport]', warnings)
    } catch (err) {
      console.error(err)
      toast.error('PPTX import failed', { id: loading })
    }
  }

  const handleExportDeckOutline = () => {
    try {
      let outlineText = `PRESENTATION: ${roomId.toUpperCase()}\n`
      ensureArray(slides).forEach((slide, idx) => {
        outlineText += `\n--- SLIDE ${idx + 1} ---\nTitle: ${slide.title || 'Untitled'}\nBody: ${slide.content || ''}\nNotes: ${slide.notes || ''}\n`
      })
      const blob = new Blob([outlineText], {
        type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = 'teamora-presentation.pptx'
      link.click()
      toast.success('Presentation exported as PPTX')
    } catch {
      toast.error('Outline export failed.')
    }
  }

  const getUsersOnSlide = (slideIdx) => {
    return activeUsers.filter((u) => u.activeApp === 'slides' && u.activeSlide === slideIdx)
  }

  // Motion variants for slide transition
  const getSlideTransition = () => {
    if (transitionEffect === 'slide') {
      return {
        initial: { opacity: 0, x: 150 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -150 }
      }
    } else if (transitionEffect === 'zoom') {
      return {
        initial: { opacity: 0, scale: 0.8 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 1.1 }
      }
    } else if (transitionEffect === 'flip') {
      return {
        initial: { opacity: 0, rotateY: 45 },
        animate: { opacity: 1, rotateY: 0 },
        exit: { opacity: 0, rotateY: -45 }
      }
    } else if (transitionEffect === 'rise') {
      return {
        initial: { opacity: 0, y: 80 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -80 }
      }
    } else if (transitionEffect === 'wipe') {
      return {
        initial: { opacity: 0, clipPath: 'inset(0 100% 0 0)' },
        animate: { opacity: 1, clipPath: 'inset(0 0% 0 0)' },
        exit: { opacity: 0, clipPath: 'inset(0 0 0 100%)' }
      }
    }
    // Default fade
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    }
  }

  useEffect(() => {
    if (isPresenting) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {})
      }
    }
  }, [isPresenting])

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isPresenting) {
        setIsPresenting(false)
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [isPresenting, setIsPresenting])

  const [presentScale, setPresentScale] = useState(1)
  useEffect(() => {
    if (isPresenting) {
      const updateScale = () => {
        const scale = Math.min(window.innerWidth / 850, window.innerHeight / ((850 * 9) / 16))
        setPresentScale(scale)
      }
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }
  }, [isPresenting])

  const renderSlide = (isForPresenting = false) => {
    return (
      <div
        className={`relative aspect-[16/9] w-[850px] overflow-hidden bg-gradient-to-br rounded-lg pointer-events-auto ${theme.gradient} ${isForPresenting ? '' : 'shadow-2xl ring-1 ring-border/50'}`}
        style={
          isForPresenting
            ? { transform: `scale(${presentScale})`, transformOrigin: 'center' }
            : { cursor: activeTool === 'textbox' ? 'crosshair' : 'default' }
        }
        onClick={isForPresenting ? undefined : (e) => e.stopPropagation()}
        onMouseDown={isForPresenting ? undefined : handleCanvasMouseDown}
        onMouseMove={isForPresenting ? undefined : handleCanvasMouseMove}
        onMouseLeave={isForPresenting ? undefined : () => socket?.emit('cursor-move', { x: null, y: null })}
      >
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.accent}`} />

        {/* Creation Dotted Rectangle */}
        {!isForPresenting && creationRect && (
          <div
            className="absolute border-2 border-dashed border-primary pointer-events-none z-50 bg-primary/5"
            style={{
              left: creationRect.x,
              top: creationRect.y,
              width: creationRect.width,
              height: creationRect.height
            }}
          />
        )}

        {/* Live Cursors Overlay */}
        {!isForPresenting &&
          Object.values(liveCursors).map((cursor) => (
            <div
              key={cursor.senderSocketId}
              className="absolute pointer-events-none z-[100] flex items-center"
              style={{
                left: cursor.x,
                top: cursor.y,
                transition: 'left 0.1s linear, top 0.1s linear'
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill={cursor.color}
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-md -translate-x-1 -translate-y-1"
              >
                <path
                  d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.8c.45 0 .67-.54.35-.85L6.35 2.85a.5.5 0 0 0-.85.35Z"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>
              <div
                className="absolute top-5 left-3 px-2 py-0.5 rounded text-[10px] font-semibold text-white whitespace-nowrap drop-shadow-sm"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.name}
              </div>
            </div>
          ))}

        {/* Dynamic templates */}
        {activeSlideData.layout === 'title' ? (
          <div className="flex flex-col justify-center items-center h-full text-center">
            {isForPresenting ? (
              <div className="text-4xl font-bold text-slate-900 dark:text-on-primary w-3/4 text-center py-2">
                {activeSlideData.title}
              </div>
            ) : (
              <input
                type="text"
                value={activeSlideData.title || ''}
                onChange={(e) => handleSlideUpdate('title', e.target.value)}
                className="text-4xl font-bold text-text border-b border-transparent focus:border-primary/30 outline-none w-3/4 text-center bg-transparent py-2 transition-colors"
                placeholder="Enter Title"
              />
            )}
            {isForPresenting ? (
              <div className="text-base text-slate-700 dark:text-slate-300 w-3/4 text-center py-2 mt-4 min-h-24">
                {activeSlideData.content}
              </div>
            ) : (
              <textarea
                value={activeSlideData.content || ''}
                onChange={(e) => handleSlideUpdate('content', e.target.value)}
                className="text-base text-muted outline-none w-3/4 text-center bg-transparent py-2 resize-none mt-4 h-24 focus:bg-card-sunken/50 transition-colors rounded-lg"
                placeholder="Enter subtitle details..."
              />
            )}
          </div>
        ) : activeSlideData.layout === 'split' ? (
          <div className="h-full flex flex-col px-10 py-8">
            {isForPresenting ? (
              <div className="text-2xl font-bold text-slate-900 dark:text-on-primary py-1 w-full text-center">
                {activeSlideData.title}
              </div>
            ) : (
              <input
                type="text"
                value={activeSlideData.title || ''}
                onChange={(e) => handleSlideUpdate('title', e.target.value)}
                className="text-2xl font-bold text-text border-b border-transparent focus:border-primary/30 outline-none bg-transparent py-1 w-full text-center transition-colors"
                placeholder="Enter Title"
              />
            )}
            <div className="grid grid-cols-2 gap-8 flex-1 mt-8">
              {isForPresenting ? (
                <div className="p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {activeSlideData.content}
                </div>
              ) : (
                <textarea
                  value={activeSlideData.content || ''}
                  onChange={(e) => handleSlideUpdate('content', e.target.value)}
                  className="border border-dashed border-border/50 rounded-xl p-4 text-sm bg-transparent resize-none h-full outline-none focus:border-primary/50 focus:bg-card-sunken/30 transition-colors"
                  placeholder="Column 1 text..."
                />
              )}
              {isForPresenting ? (
                <div className="p-4 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {activeSlideData.splitContent2}
                </div>
              ) : (
                <textarea
                  value={activeSlideData.splitContent2 || ''}
                  onChange={(e) => handleSlideUpdate('splitContent2', e.target.value)}
                  className="border border-dashed border-border/50 rounded-xl p-4 text-sm bg-transparent resize-none h-full outline-none focus:border-primary/50 focus:bg-card-sunken/30 transition-colors"
                  placeholder="Column 2 text..."
                />
              )}
            </div>
          </div>
        ) : activeSlideData.layout === 'image-left' ? (
          <div className="h-full flex gap-8 items-center px-8 py-6">
            <div className="w-1/2 aspect-[4/3] bg-card-sunken/50 rounded-2xl flex flex-col items-center justify-center border border-dashed border-border/50 text-muted text-xs relative overflow-hidden">
              {activeSlideData.elements?.some((el) => el.type === 'image') ? (
                <img
                  src={activeSlideData.elements.find((el) => el.type === 'image').src}
                  className="w-full h-full object-cover rounded-2xl absolute inset-0"
                  alt="slide-left"
                />
              ) : (
                <>
                  <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                  <span>Insert Image element</span>
                </>
              )}
            </div>
            <div className="w-1/2 flex flex-col justify-center gap-4">
              {isForPresenting ? (
                <div className="text-3xl font-bold text-slate-900 dark:text-on-primary py-1">
                  {activeSlideData.title}
                </div>
              ) : (
                <input
                  type="text"
                  value={activeSlideData.title || ''}
                  onChange={(e) => handleSlideUpdate('title', e.target.value)}
                  className="text-3xl font-bold text-text outline-none bg-transparent border-b border-transparent focus:border-primary/30 transition-colors py-1"
                  placeholder="Title"
                />
              )}
              {isForPresenting ? (
                <div className="text-sm text-slate-700 dark:text-slate-300 p-2 whitespace-pre-wrap min-h-40">
                  {activeSlideData.content}
                </div>
              ) : (
                <textarea
                  value={activeSlideData.content || ''}
                  onChange={(e) => handleSlideUpdate('content', e.target.value)}
                  className="text-sm text-muted bg-transparent resize-none h-40 outline-none focus:border-primary/30 focus:bg-card-sunken/30 p-2 rounded-lg transition-colors"
                  placeholder="Content text..."
                />
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col px-10 py-8">
            {isForPresenting ? (
              <div className="text-3xl font-bold text-slate-900 dark:text-on-primary py-2 w-full">
                {activeSlideData.title}
              </div>
            ) : (
              <input
                type="text"
                value={activeSlideData.title || ''}
                onChange={(e) => handleSlideUpdate('title', e.target.value)}
                className="text-3xl font-bold text-text border-b border-transparent focus:border-primary/30 outline-none bg-transparent py-2 w-full transition-colors"
                placeholder="Click to add title"
              />
            )}
            {isForPresenting ? (
              <div className="flex-1 text-base text-slate-700 dark:text-slate-300 mt-6 p-2 whitespace-pre-wrap">
                {activeSlideData.content}
              </div>
            ) : (
              <textarea
                value={activeSlideData.content || ''}
                onChange={(e) => handleSlideUpdate('content', e.target.value)}
                className="flex-1 text-base text-muted bg-transparent resize-none mt-6 outline-none focus:border-primary/30 focus:bg-card-sunken/30 p-2 rounded-lg transition-colors"
                placeholder="Click to add body content..."
              />
            )}
          </div>
        )}

        {/* Absolute elements */}
        {ensureArray(slideElements).map((el) => {
          const isSelected = !isForPresenting && selectedElemId === el.id
          const obj = (
            <SlideObject
              key={el.id}
              el={el}
              isSelected={isSelected}
              onSelect={isForPresenting ? () => {} : setSelectedElemId}
              onDrag={isForPresenting ? () => {} : handleElementDrag}
              onDelete={isForPresenting ? undefined : deleteElement}
              externalIsEditing={!isForPresenting && editingElemId === el.id}
              onSetEditing={isForPresenting ? undefined : (editing) => setEditingElemId(editing ? el.id : null)}
            >
              {(el.type === 'textbox' || el.type === 'shape' || el.type === 'text') && (
                <TextEditor
                  el={el}
                  patchElement={isForPresenting ? () => {} : patchElement}
                  isSelected={isSelected}
                  onDuplicateToNextSlide={isForPresenting ? undefined : handleOverflowToNextSlide}
                  undo={undo}
                  redo={redo}
                />
              )}
              {el.type === 'image' ? (
                <img
                  src={el.src}
                  className="w-full h-full object-cover rounded pointer-events-none"
                  alt="deck-insert"
                />
              ) : el.type === 'video' ? (
                <iframe
                  src={el.src}
                  className="w-full h-full rounded pointer-events-none bg-black"
                  title="deck-video"
                  frameBorder="0"
                />
              ) : el.type === 'shape' ? (
                <div className="w-full h-full bg-primary/35 rounded-full border-2 border-primary pointer-events-none" />
              ) : el.type === 'table' ? (
                <table className="w-full h-full border border-slate-300 text-[10px] bg-card-sunken pointer-events-none">
                  <tbody>
                    <tr>
                      <td className="border p-1 text-text">Row Cell</td>
                      <td className="border p-1 text-text">Row Cell</td>
                    </tr>
                    <tr>
                      <td className="border p-1 text-text">Row Cell</td>
                      <td className="border p-1 text-text">Row Cell</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="w-full h-full border border-dashed border-border pointer-events-none" />
              )}
            </SlideObject>
          )

          if (isForPresenting) {
            // Apply a pointer-events-none wrapper so elements aren't interactive
            return (
              <div key={el.id} className="pointer-events-none absolute inset-0">
                {obj}
              </div>
            )
          }
          return obj
        })}
      </div>
    )
  }

  const selectedElem = selectedElemId ? activeSlideData?.elements?.find((e) => e.id === selectedElemId) : null
  const isTextElem = selectedElem && (selectedElem.type === 'textbox' || selectedElem.type === 'shape')

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card">
      {/* Presentation Fullscreen */}
      {isPresenting && (
        <div
          className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center select-none group"
          onClick={() => {
            const nextIndex = nextVisibleIndex(activeSlide, 1)
            setActiveSlide(nextIndex)
            socket.emit('change-slide', { roomId, slideIndex: nextIndex })
          }}
        >
          {/* Active Slide Scaled to Fit */}
          <div className="relative w-full h-full max-w-[100vw] max-h-[100vh] aspect-video overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                {...getSlideTransition()}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
                className={`w-full h-full bg-gradient-to-br ${theme.gradient} p-12 md:p-20 flex flex-col justify-center items-center text-center relative overflow-hidden`}
              >
                {renderSlide(true)}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls floating panel (visible on hover) */}
          <div
            className="absolute bottom-8 flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                const prevIndex = nextVisibleIndex(activeSlide, -1)
                setActiveSlide(prevIndex)
                socket.emit('change-slide', { roomId, slideIndex: prevIndex })
              }}
              disabled={nextVisibleIndex(activeSlide, -1) === activeSlide}
              className="cursor-pointer rounded-full p-1.5 text-on-primary/80 transition-all hover:bg-card/15 hover:text-on-primary disabled:opacity-35"
              title="Previous Slide (Left Arrow)"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="select-none text-xs font-bold text-on-primary">
              {visibleSlideIndexes.indexOf(activeSlide) + 1 || 1} / {visibleSlideIndexes.length || slides.length}
            </span>
            <button
              type="button"
              onClick={() => {
                const nextIndex = nextVisibleIndex(activeSlide, 1)
                setActiveSlide(nextIndex)
                socket.emit('change-slide', { roomId, slideIndex: nextIndex })
              }}
              disabled={nextVisibleIndex(activeSlide, 1) === activeSlide}
              className="cursor-pointer rounded-full p-1.5 text-on-primary/80 transition-all hover:bg-card/15 hover:text-on-primary disabled:opacity-35"
              title="Next Slide (Right Arrow)"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="w-px h-5 bg-card/10" />
            <button
              onClick={() => setIsPresenting(false)}
              className="flex items-center gap-1.5 px-3 py-1 bg-card/10 hover:bg-red-500/20 hover:text-red-400 text-on-primary rounded-full text-[10px] font-bold transition-all cursor-pointer"
              title="Exit Presentation (Esc)"
            >
              <X className="w-3.5 h-3.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      )}

      {/* Ribbon UI */}
      <div className="flex flex-col border-b border-border bg-card shrink-0 z-20">
        {/* Tab Headers */}
        <div className="flex items-center gap-6 px-4 h-10 border-b border-border/50 text-[11px] font-semibold text-muted">
          {/* Branding */}
          <div className="flex items-center gap-2 mr-4">
            <div className="w-5 h-5 bg-gradient-to-br from-primary to-indigo-600 rounded flex items-center justify-center text-on-primary shadow-sm shrink-0">
              <Presentation className="w-3 h-3" />
            </div>
            <input
              type="text"
              defaultValue="Teamora Pitch Deck"
              className="font-bold text-xs text-text bg-transparent border border-transparent focus:border-primary/50 focus:outline-none rounded px-1 hover:bg-card-sunken transition-colors w-32 truncate"
            />
          </div>

          {['home', 'insert', 'design', 'transitions'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveRibbonTab(tab)}
              className={`relative h-full px-2 capitalize transition-colors hover:text-text ${activeRibbonTab === tab ? 'text-primary font-bold' : ''}`}
            >
              {tab}
              {activeRibbonTab === tab && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 inset-x-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}

          <div className="flex-1" />

          {/* Right side static collaboration */}
          <div className="flex items-center gap-3">
            {activeUsers.length > 0 && (
              <div className="flex -space-x-2 mr-2">
                {activeUsers.map((u, i) => (
                  <div key={i} className="relative group">
                    <img
                      className="w-6 h-6 rounded-full border-2 bg-card object-cover shadow-sm transition-transform group-hover:-translate-y-1 cursor-pointer"
                      src={u.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                      alt={u.user}
                      style={{ borderColor: u.color }}
                    />
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-lg">
                      {u.user}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 border-r border-border pr-3 mr-1">
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted mr-3 bg-card-sunken px-2 py-1 rounded-md">
                <Cloud className="w-3 h-3 text-primary/80" /> Saved
              </div>
              <button
                className="p-1.5 text-muted hover:text-primary rounded-md hover:bg-primary/10 transition-colors"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExportDeckOutline}
                className="p-1.5 text-muted hover:text-text rounded-md hover:bg-card-sunken cursor-pointer transition-colors"
                title="Export Outline"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setIsPresenting(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary hover:bg-primary-hover text-on-primary text-[10px] font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Present</span>
            </button>
          </div>
        </div>

        {/* Ribbon Content Panel */}
        <div className="h-14 px-4 flex items-center gap-4 bg-card/50">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRibbonTab}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-6 w-full"
            >
              {activeRibbonTab === 'home' &&
                (() => {
                  const isFormatActive = isTextElem && selectedElem
                  const fontFam =
                    isFormatActive && selectedElem.fontFamily ? selectedElem.fontFamily.split(',')[0] : 'Inter'
                  const fontSz = isFormatActive && selectedElem.fontSize ? parseInt(selectedElem.fontSize, 10) : 16
                  const isBold = isFormatActive && selectedElem.fontWeight === 'bold'
                  const isItal = isFormatActive && selectedElem.fontStyle === 'italic'
                  const isUnder = isFormatActive && selectedElem.textDecoration === 'underline'
                  const isStrike = isFormatActive && selectedElem.textDecoration === 'line-through'
                  const align = isFormatActive && selectedElem.textAlign ? selectedElem.textAlign : 'left'
                  const textColor = isFormatActive && selectedElem.color ? selectedElem.color : '#000000'
                  const highlightColor =
                    isFormatActive && selectedElem.backgroundColor ? selectedElem.backgroundColor : 'transparent'

                  return (
                    <>
                      <div className="flex items-center gap-1 border-r border-border/50 pr-4">
                        <button
                          onClick={undo}
                          className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                          title="Undo"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={redo}
                          className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                          title="Redo"
                        >
                          <Redo2 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                          title="Format Painter (Coming Soon)"
                        >
                          <Paintbrush className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 border-r border-border/50 pr-4">
                        <button
                          onClick={addSlide}
                          className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-[9px] font-bold">New Slide</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 border-r border-border/50 pr-4">
                        <button
                          onClick={addTextBoxToSlide}
                          className={`flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg transition-colors ${activeTool === 'textbox' ? 'bg-primary/20 text-primary border border-primary/30 shadow-inner font-bold' : 'text-muted hover:text-text hover:bg-card-sunken border border-transparent'}`}
                        >
                          <Type className="w-4 h-4" />
                          <span className="text-[9px]">Text Box</span>
                        </button>
                        <button
                          onClick={() => addElementToSlide('shape')}
                          className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                        >
                          <Shapes className="w-4 h-4" />
                          <span className="text-[9px]">Shape</span>
                        </button>
                        <button
                          onClick={() => addElementToSlide('image')}
                          className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                        >
                          <ImageIcon className="w-4 h-4" />
                          <span className="text-[9px]">Image</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 pl-2">
                        {/* Font Selector */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === 'font' ? null : 'font')}
                            className="flex items-center gap-1 px-2 py-1 text-xs hover:bg-card-sunken rounded font-medium transition-colors border border-transparent"
                          >
                            <span className="truncate max-w-[80px]">{fontFam}</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                          </button>
                          {activeDropdown === 'font' && (
                            <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[120px] z-50">
                              {['Inter', 'Roboto', 'Playfair Display', 'Georgia', 'Courier New', 'Caveat'].map((f) => (
                                <button
                                  key={f}
                                  onClick={() => {
                                    if (isFormatActive)
                                      patchElement(selectedElem.id, { fontFamily: `${f}, sans-serif` })
                                    setActiveDropdown(null)
                                  }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-card-sunken transition-colors text-text"
                                  style={{ fontFamily: f }}
                                >
                                  {f}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Size Controls */}
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={() => {
                              if (!isFormatActive) return
                              patchElement(selectedElem.id, { fontSize: `${Math.max(8, fontSz - 2)}px` })
                            }}
                            className={`p-1 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActiveDropdown(activeDropdown === 'size' ? null : 'size')}
                              className="px-1.5 py-1 text-xs hover:bg-card-sunken rounded font-bold min-w-[32px] text-center transition-colors text-text border border-transparent"
                            >
                              {fontSz}
                            </button>
                            {activeDropdown === 'size' && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[60px] max-h-[160px] overflow-y-auto z-50">
                                {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64].map((sz) => (
                                  <button
                                    key={sz}
                                    onClick={() => {
                                      if (isFormatActive) patchElement(selectedElem.id, { fontSize: `${sz}px` })
                                      setActiveDropdown(null)
                                    }}
                                    className="w-full text-center px-3 py-1 text-xs hover:bg-card-sunken transition-colors text-text"
                                  >
                                    {sz}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (!isFormatActive) return
                              patchElement(selectedElem.id, { fontSize: `${Math.min(120, fontSz + 2)}px` })
                            }}
                            className={`p-1 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Style Buttons */}
                        <div className="flex items-center gap-0.5">
                          <button
                            disabled={!isFormatActive}
                            onClick={() => patchElement(selectedElem.id, { fontWeight: isBold ? 'normal' : 'bold' })}
                            className={`p-1.5 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : isBold ? 'bg-primary/20 text-primary' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                            title="Bold"
                          >
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!isFormatActive}
                            onClick={() => patchElement(selectedElem.id, { fontStyle: isItal ? 'normal' : 'italic' })}
                            className={`p-1.5 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : isItal ? 'bg-primary/20 text-primary' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                            title="Italic"
                          >
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!isFormatActive}
                            onClick={() =>
                              patchElement(selectedElem.id, { textDecoration: isUnder ? 'none' : 'underline' })
                            }
                            className={`p-1.5 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : isUnder ? 'bg-primary/20 text-primary' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                            title="Underline"
                          >
                            <Underline className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!isFormatActive}
                            onClick={() =>
                              patchElement(selectedElem.id, { textDecoration: isStrike ? 'none' : 'line-through' })
                            }
                            className={`p-1.5 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : isStrike ? 'bg-primary/20 text-primary' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                            title="Strikethrough"
                          >
                            <Strikethrough className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={!isFormatActive}
                            onClick={() =>
                              patchElement(selectedElem.id, {
                                fontWeight: 'normal',
                                fontStyle: 'normal',
                                textDecoration: 'none',
                                color: '#000000',
                                backgroundColor: 'transparent'
                              })
                            }
                            className={`p-1.5 rounded transition-colors ml-0.5 ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                            title="Clear Formatting"
                          >
                            <RemoveFormatting className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Color Selectors */}
                        <div className="flex items-center gap-0.5">
                          <div className="relative">
                            <button
                              disabled={!isFormatActive}
                              onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
                              className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                              title="Text Color"
                            >
                              <Palette className="w-3.5 h-3.5" style={{ color: textColor }} />
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            {activeDropdown === 'color' && (
                              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-2 grid grid-cols-4 gap-1.5 min-w-[100px] z-50">
                                {[
                                  '#000000',
                                  '#ffffff',
                                  '#3b82f6',
                                  '#ef4444',
                                  '#10b981',
                                  '#f59e0b',
                                  '#8b5cf6',
                                  '#ec4899'
                                ].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => {
                                      patchElement(selectedElem.id, { color: c })
                                      setActiveDropdown(null)
                                    }}
                                    className="w-5 h-5 rounded-full border border-border shadow-sm"
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <button
                              disabled={!isFormatActive}
                              onClick={() => setActiveDropdown(activeDropdown === 'highlight' ? null : 'highlight')}
                              className={`p-1.5 rounded transition-colors flex items-center gap-0.5 ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                              title="Highlight Color"
                            >
                              <Highlighter
                                className="w-3.5 h-3.5"
                                style={{ color: highlightColor !== 'transparent' ? highlightColor : 'currentColor' }}
                              />
                              <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                            </button>
                            {activeDropdown === 'highlight' && (
                              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-xl p-2 grid grid-cols-4 gap-1.5 min-w-[100px] z-50">
                                {[
                                  'transparent',
                                  '#fef08a',
                                  '#bbf7d0',
                                  '#bfdbfe',
                                  '#fecaca',
                                  '#e9d5ff',
                                  '#fed7aa',
                                  '#fbcfe8'
                                ].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => {
                                      patchElement(selectedElem.id, { backgroundColor: c })
                                      setActiveDropdown(null)
                                    }}
                                    className="w-5 h-5 rounded-full border border-border shadow-sm flex items-center justify-center"
                                    style={{ backgroundColor: c === 'transparent' ? '#ffffff' : c }}
                                  >
                                    {c === 'transparent' && (
                                      <span className="text-red-500 text-[10px] font-bold">/</span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Alignments */}
                        <div className="flex items-center gap-0.5">
                          {['left', 'center', 'right', 'justify'].map((a) => (
                            <button
                              key={a}
                              disabled={!isFormatActive}
                              onClick={() => patchElement(selectedElem.id, { textAlign: a })}
                              className={`p-1.5 rounded transition-colors ${!isFormatActive ? 'opacity-50 cursor-not-allowed text-muted' : align === a ? 'bg-primary/20 text-primary' : 'hover:bg-card-sunken text-muted hover:text-text'}`}
                              title={`Align ${a}`}
                            >
                              {a === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                              {a === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                              {a === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                              {a === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                            </button>
                          ))}
                        </div>

                        <div className="w-px h-4 bg-border/50 mx-1" />

                        {/* Paragraph format placeholders */}
                        <div className="flex items-center gap-0.5">
                          <button
                            className="p-1.5 rounded text-muted opacity-50 cursor-not-allowed"
                            title="Bullets (Requires rich text model)"
                          >
                            <List className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded text-muted opacity-50 cursor-not-allowed"
                            title="Numbering (Requires rich text model)"
                          >
                            <ListOrdered className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 rounded text-muted opacity-50 cursor-not-allowed"
                            title="Line Spacing (Requires rich text model)"
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )
                })()}

              {activeRibbonTab === 'insert' && (
                <>
                  <div className="flex items-center gap-1 border-r border-border/50 pr-4">
                    <button
                      onClick={() => addElementToSlide('table')}
                      className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                    >
                      <Table2 className="w-4 h-4" />
                      <span className="text-[9px]">Table</span>
                    </button>
                    <button
                      onClick={() => addElementToSlide('video')}
                      className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-muted hover:text-text hover:bg-card-sunken transition-colors"
                    >
                      <Video className="w-4 h-4" />
                      <span className="text-[9px]">Video</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <label className="flex flex-col items-center gap-0.5 p-1.5 px-3 rounded-lg text-muted hover:text-text hover:bg-card-sunken cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-[9px]">Import PPTX</span>
                      <input
                        type="file"
                        accept=".pptx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) handleImportPptx(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                </>
              )}

              {activeRibbonTab === 'design' && (
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Themes</span>
                  <div className="flex items-center gap-2">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id)}
                        className={`w-16 h-10 rounded shadow-sm border-2 transition-all ${selectedTheme === t.id ? 'border-primary scale-105' : 'border-transparent hover:border-border'} flex flex-col overflow-hidden bg-gradient-to-br ${t.gradient}`}
                        title={t.label}
                      >
                        <div className={`h-1.5 w-full bg-gradient-to-r ${t.accent}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeRibbonTab === 'transitions' && (
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                    Slide Transition
                  </span>
                  <div className="flex items-center gap-2">
                    {['fade', 'slide', 'zoom', 'none'].map((effect) => (
                      <button
                        key={effect}
                        onClick={() => setTransitionEffect(effect)}
                        className={`px-3 py-1.5 rounded-lg text-xs capitalize transition-colors ${transitionEffect === effect ? 'bg-primary text-on-primary font-bold shadow-sm' : 'bg-card-sunken text-muted hover:text-text'}`}
                      >
                        {effect}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Main 3-Column Workspace */}
      <div className="flex min-h-0 flex-1 overflow-hidden bg-card-sunken">
        {/* LEFT COLUMN: Premium Thumbnails Sidebar */}
        <div className="flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-card/95">
          <div className="px-4 py-3 flex justify-between items-center border-b border-border/40 shadow-sm z-10">
            <span className="text-xs font-extrabold text-text uppercase tracking-wider">Slides</span>
            <button
              onClick={addSlide}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-on-primary transition-colors flex items-center justify-center shadow-sm"
              title="New Slide"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-contain p-3">
            {ensureArray(slides).length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center opacity-60">
                <Presentation className="w-6 h-6 mb-2 text-muted" />
                <p className="text-[10px] text-muted">
                  No slides yet.
                  <br />
                  Click + to add.
                </p>
              </div>
            )}

            {ensureArray(slides).map((s, i) => {
              const isActive = activeSlide === i
              const usersHere = getUsersOnSlide(i)
              const prevSection = i > 0 ? slides[i - 1]?.section : null
              const showSectionHeader = s.section && s.section !== prevSection
              return (
                <div key={s.id || i}>
                  {showSectionHeader && (
                    <div className="mb-1 mt-2 flex items-center gap-1 px-1 text-[9px] font-bold uppercase tracking-wide text-primary">
                      <FolderInput className="h-3 w-3" />
                      {s.section}
                    </div>
                  )}
                  <div
                    className={`group relative flex items-start gap-2 rounded-lg transition ${
                      dropTargetIndex === i ? 'bg-primary/10 ring-1 ring-primary/40' : ''
                    } ${dragSlideIndex === i ? 'opacity-50' : ''}`}
                    draggable
                    onDragStart={(e) => onThumbDragStart(i, e)}
                    onDragOver={(e) => onThumbDragOver(i, e)}
                    onDrop={(e) => onThumbDrop(i, e)}
                    onDragEnd={onThumbDragEnd}
                  >
                    <span className="mt-2.5 w-4 cursor-grab select-none text-right text-[10px] font-bold text-muted active:cursor-grabbing">
                      {i + 1}
                    </span>

                    {/* Hover Actions Bar */}
                    <div className="absolute right-2 top-2 z-40 hidden group-hover:flex items-center gap-0.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg p-1 border border-slate-200 dark:border-slate-800 shadow-md">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRenameSlide(i)
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors"
                        title="Rename"
                      >
                        <Type className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleCopySlide(i)
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors"
                        title="Copy"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDuplicateSlide(i)
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors"
                        title="Duplicate"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleHideSlide(i)
                        }}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded transition-colors"
                        title={s.hidden ? 'Show' : 'Hide'}
                      >
                        {s.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteSlide(i)
                        }}
                        className="p-1 hover:bg-red-500 hover:text-white text-red-500 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlide(i)
                        socket.emit('change-slide', { roomId, slideIndex: i })
                      }}
                      className={`relative flex aspect-[16/9] flex-1 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-2 text-left ${theme.gradient} ${
                        isActive ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-text/30'
                      } ${s.hidden ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${theme.accent}`} />
                      <div className="flex w-full items-start justify-between gap-1">
                        <div className="truncate text-[9px] font-bold text-text">{s.title || 'Untitled'}</div>
                        {s.hidden && <EyeOff className="h-3 w-3 shrink-0 text-muted" />}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[7px] leading-snug text-muted">{s.content}</div>

                      {usersHere.length > 0 && (
                        <div className="absolute bottom-1 right-1 z-10 flex -space-x-1.5 overflow-hidden p-0.5">
                          {ensureArray(usersHere).map((u, uIdx) => (
                            <img
                              key={uIdx}
                              className="inline-block h-3.5 w-3.5 rounded-full border bg-card object-cover"
                              src={u.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                              alt={u.user}
                              style={{ borderColor: u.color }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER COLUMN: Canvas Area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden relative">
          {slides.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-card rounded-full flex items-center justify-center shadow-sm mb-4 border border-border">
                <Presentation className="w-8 h-8 text-muted" />
              </div>
              <h2 className="text-lg font-bold text-text mb-2">Start a new presentation</h2>
              <p className="text-xs text-muted mb-6">Add a blank slide or import a PPTX file to begin.</p>
              <button
                onClick={addSlide}
                className="px-5 py-2 bg-primary text-on-primary text-xs font-semibold rounded-xl flex items-center gap-2 hover:bg-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4" /> Add First Slide
              </button>
            </div>
          ) : (
            <>
              <div
                className="flex-1 relative overflow-auto bg-card-sunken flex items-center justify-center p-12 transition-colors duration-150"
                onClick={() => {
                  setSelectedElemId(null)
                  setEditingElemId(null)
                }}
              >
                {/* Fixed Center Alignment Guides */}
                <div className="absolute inset-x-0 top-1/2 h-px bg-primary/20 pointer-events-none border-t border-dashed border-primary/30" />
                <div className="absolute inset-y-0 left-1/2 w-px bg-primary/20 pointer-events-none border-l border-dashed border-primary/30" />

                {/* Scaled Workspace */}
                <div
                  style={{
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0, 1)'
                  }}
                  className="relative flex items-center justify-center pointer-events-none"
                >
                  {renderSlide(false)}
                </div>
              </div>

              {/* Canvas Bottom Controls (Zoom & Notes toggle) */}
              <div className="h-10 border-t border-border bg-card px-4 flex items-center justify-between z-10 shrink-0">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded transition-colors ${showNotes ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text hover:bg-card-sunken'}`}
                >
                  <StickyNote className="w-3.5 h-3.5" /> Notes
                </button>

                <div className="flex items-center gap-1 bg-card-sunken rounded-lg border border-border px-1">
                  <button
                    onClick={() => setZoom((z) => Math.max(25, z - 25))}
                    className="p-1 text-muted hover:text-text transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span
                    className="text-[10px] font-bold text-text w-10 text-center select-none cursor-pointer hover:text-primary"
                    onClick={() => setZoom(100)}
                    title="Reset Zoom"
                  >
                    {zoom}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    className="p-1 text-muted hover:text-text transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Speaker notes Drawer */}
              {showNotes && (
                <div className="h-40 border-t border-border bg-card p-4 shrink-0 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StickyNote className="w-3.5 h-3.5 text-muted" />
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Speaker Notes</span>
                    </div>
                    <button onClick={() => setShowNotes(false)} className="text-muted hover:text-text p-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={activeSlideData.notes || ''}
                    onChange={(e) => handleSlideUpdate('notes', e.target.value)}
                    placeholder="Add private presenter notes for this slide..."
                    className="w-full h-24 bg-card-sunken border border-border rounded-lg px-3 py-2 text-xs text-text placeholder-muted/65 focus:outline-none focus:border-primary resize-none font-sans transition-colors"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT COLUMN: Properties Panel */}
        {showRightPanel && (
          <div className="w-64 shrink-0 flex flex-col h-full border-l border-border bg-card overflow-y-auto">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold text-text flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-muted" /> Properties
              </span>
            </div>

            {/* Contextual Content */}
            {!selectedElemId ? (
              <div className="p-4 space-y-6">
                {/* Slide Layout */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted mb-3 uppercase tracking-wider">Slide Layout</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {['title', 'split', 'image-left', 'normal'].map((l) => (
                      <button
                        key={l}
                        onClick={() => handleSlideUpdate('layout', l)}
                        className={`py-2 px-2 text-[10px] font-bold capitalize rounded-lg border transition-colors ${activeSlideData.layout === l ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted hover:border-text hover:text-text bg-card-sunken'}`}
                      >
                        {l.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-border" />

                {/* Theme */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted mb-3 uppercase tracking-wider">Slide Theme</h3>
                  <div className="space-y-2">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTheme(t.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${selectedTheme === t.id ? 'border-primary bg-primary/10 text-primary' : 'border-transparent text-muted hover:bg-card-sunken hover:text-text'}`}
                      >
                        <div className={`w-6 h-4 rounded bg-gradient-to-r ${t.accent}`} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="border-border" />

                {/* Transition */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted mb-3 uppercase tracking-wider">Transition</h3>
                  <select
                    value={transitionEffect}
                    onChange={(e) => setTransitionEffect(e.target.value)}
                    className="w-full bg-card-sunken text-xs font-medium px-3 py-2.5 rounded-lg border border-border text-text focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="fade">Fade</option>
                    <option value="slide">Slide</option>
                    <option value="zoom">Zoom</option>
                    <option value="flip">Flip</option>
                    <option value="rise">Rise</option>
                    <option value="wipe">Wipe</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-6">
                {/* Text Typography (if applicable) */}
                {['textbox', 'text', 'shape'].includes(
                  ensureArray(slideElements).find((e) => e.id === selectedElemId)?.type
                ) && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider">Typography</h3>
                    </div>
                    <div className="space-y-3">
                      <select
                        value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.fontFamily || 'inherit'}
                        onChange={(e) => patchElement(selectedElemId, { fontFamily: e.target.value })}
                        className="w-full bg-card-sunken border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none transition-colors"
                      >
                        <option value="inherit">Default (Inter)</option>
                        <option value="serif">Serif (Georgia)</option>
                        <option value="monospace">Monospace</option>
                        <option value="'Comic Sans MS', cursive">Comic Sans</option>
                      </select>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Size (e.g. 16px)"
                          value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.fontSize || '14px'}
                          onChange={(e) => patchElement(selectedElemId, { fontSize: e.target.value })}
                          className="w-1/2 bg-card-sunken border border-border rounded-lg px-2 py-1.5 text-xs text-text focus:border-primary focus:outline-none transition-colors"
                        />
                        <button
                          onClick={() => {
                            const cur = ensureArray(slideElements).find((e) => e.id === selectedElemId)?.fontWeight
                            patchElement(selectedElemId, { fontWeight: cur === 'bold' ? 'normal' : 'bold' })
                          }}
                          className={`flex-1 rounded-lg border transition-colors flex items-center justify-center ${ensureArray(slideElements).find((e) => e.id === selectedElemId)?.fontWeight === 'bold' ? 'bg-primary/10 border-primary text-primary' : 'bg-card-sunken border-border text-muted hover:text-text'}`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex bg-card-sunken rounded-lg border border-border overflow-hidden">
                        {['left', 'center', 'right'].map((align) => (
                          <button
                            key={align}
                            onClick={() => patchElement(selectedElemId, { textAlign: align })}
                            className={`flex-1 py-1.5 flex justify-center items-center transition-colors ${ensureArray(slideElements).find((e) => e.id === selectedElemId)?.textAlign === align ? 'bg-primary/20 text-primary' : 'text-muted hover:bg-card hover:text-text'}`}
                          >
                            {align === 'left' ? (
                              <AlignLeft className="w-3.5 h-3.5" />
                            ) : align === 'center' ? (
                              <AlignCenter className="w-3.5 h-3.5" />
                            ) : (
                              <AlignRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border border-border overflow-hidden shrink-0">
                          <input
                            type="color"
                            className="w-8 h-8 -m-1 cursor-pointer"
                            value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.color || '#000000'}
                            onChange={(e) => patchElement(selectedElemId, { color: e.target.value })}
                          />
                        </div>
                        <span className="text-[10px] text-muted">Text Color</span>
                      </div>
                    </div>
                  </div>
                )}

                {['textbox', 'text', 'shape'].includes(
                  ensureArray(slideElements).find((e) => e.id === selectedElemId)?.type
                ) && <hr className="border-border" />}

                {/* Appearance */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted mb-3 uppercase tracking-wider">Appearance</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border border-border overflow-hidden shrink-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzhhYWGMYAEYB8RmROaABADeOQ8CXl/xfgAAAABJRU5ErkJggg==')]">
                          <input
                            type="color"
                            className="w-8 h-8 -m-1 cursor-pointer"
                            value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.fill || '#ffffff'}
                            onChange={(e) => patchElement(selectedElemId, { fill: e.target.value })}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-text">Fill Color</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded border border-border overflow-hidden shrink-0">
                          <input
                            type="color"
                            className="w-8 h-8 -m-1 cursor-pointer"
                            value={
                              ensureArray(slideElements).find((e) => e.id === selectedElemId)?.borderColor || '#cccccc'
                            }
                            onChange={(e) => patchElement(selectedElemId, { borderColor: e.target.value })}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-text">Border</span>
                      </div>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        placeholder="Width"
                        value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.borderWidth ?? 1}
                        onChange={(e) => patchElement(selectedElemId, { borderWidth: parseInt(e.target.value) || 0 })}
                        className="w-12 bg-card-sunken border border-border rounded px-1.5 py-1 text-[10px] text-center text-text focus:border-primary focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-medium text-text shrink-0">Opacity</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={ensureArray(slideElements).find((e) => e.id === selectedElemId)?.opacity ?? 1}
                        onChange={(e) => patchElement(selectedElemId, { opacity: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  </div>
                </div>

                <hr className="border-border" />

                {/* Transform Properties */}
                <div>
                  <h3 className="text-[10px] font-bold text-muted mb-3 uppercase tracking-wider">Transform</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="flex items-center bg-card-sunken border border-border rounded-lg px-2 overflow-hidden focus-within:border-primary transition-colors">
                      <span className="text-[9px] font-bold text-muted w-4">X</span>
                      <input
                        type="number"
                        value={Math.round(ensureArray(slideElements).find((e) => e.id === selectedElemId)?.x || 0)}
                        onChange={(e) => patchElement(selectedElemId, { x: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent py-1.5 text-xs text-text focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center bg-card-sunken border border-border rounded-lg px-2 overflow-hidden focus-within:border-primary transition-colors">
                      <span className="text-[9px] font-bold text-muted w-4">Y</span>
                      <input
                        type="number"
                        value={Math.round(ensureArray(slideElements).find((e) => e.id === selectedElemId)?.y || 0)}
                        onChange={(e) => patchElement(selectedElemId, { y: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent py-1.5 text-xs text-text focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center bg-card-sunken border border-border rounded-lg px-2 overflow-hidden focus-within:border-primary transition-colors">
                      <span className="text-[9px] font-bold text-muted w-4">W</span>
                      <input
                        type="number"
                        value={Math.round(ensureArray(slideElements).find((e) => e.id === selectedElemId)?.width || 0)}
                        onChange={(e) => patchElement(selectedElemId, { width: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent py-1.5 text-xs text-text focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center bg-card-sunken border border-border rounded-lg px-2 overflow-hidden focus-within:border-primary transition-colors">
                      <span className="text-[9px] font-bold text-muted w-4">H</span>
                      <input
                        type="number"
                        value={Math.round(ensureArray(slideElements).find((e) => e.id === selectedElemId)?.height || 0)}
                        onChange={(e) => patchElement(selectedElemId, { height: parseInt(e.target.value) || 0 })}
                        className="w-full bg-transparent py-1.5 text-xs text-text focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex items-center bg-card-sunken border border-border rounded-lg px-2 overflow-hidden focus-within:border-primary transition-colors">
                    <span className="text-[9px] font-bold text-muted w-8">Rotation</span>
                    <input
                      type="number"
                      value={Math.round(ensureArray(slideElements).find((e) => e.id === selectedElemId)?.rotation || 0)}
                      onChange={(e) => patchElement(selectedElemId, { rotation: parseInt(e.target.value) || 0 })}
                      className="w-full bg-transparent py-1.5 text-xs text-text focus:outline-none"
                    />
                    <span className="text-[9px] text-muted pr-1">°</span>
                  </div>
                </div>

                <hr className="border-border" />

                <button
                  onClick={() => deleteElement(selectedElemId)}
                  className="w-full py-2 bg-danger/10 text-danger text-xs font-bold rounded-lg hover:bg-danger/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Element
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
