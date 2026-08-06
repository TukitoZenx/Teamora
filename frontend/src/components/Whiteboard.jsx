import { useState, useEffect, useRef } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  Paintbrush,
  Eraser,
  Trash2,
  Undo2,
  Redo2,
  Minus,
  Hand,
  MousePointer2,
  PenTool,
  Sparkles,
  Lock,
  Unlock,
  Copy,
  ArrowUp,
  ArrowDown,
  Plus
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCallback } from 'react'

const generateId = (prefix = 'elem') => `${prefix}-${Math.random().toString(36).substring(7)}`

export default function Whiteboard({
  canvasRef,
  myColor,
  setMyColor,
  whiteboardTool,
  setWhiteboardTool,
  whiteboardSize,
  setWhiteboardSize,
  whiteboardCursors = {},
  socket,
  roomId,
  activeFileId,
  filesList = [],
  onDirtyChange
}) {
  const showGrid = true
  const zoom = 100
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })

  const [elements, setElements] = useState([])
  const [undoStack, setUndoStack] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [pages, setPages] = useState([{ id: 'page-1', name: 'Page 1' }])
  const [activePageId, setActivePageId] = useState('page-1')

  // Freehand drawing states (strokes persist as path elements per page)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const brushOpacity = 1.0
  const strokePointsRef = useRef([])
  const strokeMetaRef = useRef(null)

  // Selection states
  const [selectedElementId, setSelectedElementId] = useState(null)

  const containerRef = useRef(null)
  const elementsRef = useRef(elements)

  // Adjust elements state during render if active file changes (React 19 pattern)
  const [prevActiveFileId, setPrevActiveFileId] = useState(activeFileId)
  if (activeFileId !== prevActiveFileId) {
    setPrevActiveFileId(activeFileId)
    const file = filesList?.find((f) => f.id === activeFileId)
    if (file && file.content) {
      if (Array.isArray(file.content)) {
        setElements(file.content)
      } else {
        console.warn('Warning: loaded whiteboard content is not an array:', file.content)
        setElements([])
      }
    } else {
      setElements([])
    }
  }

  // Sync elements changes to the active file content
  useEffect(() => {
    if (activeFileId && Array.isArray(elements) && elements.length > 0) {
      const timeout = setTimeout(() => {
        socket.emit('file-content-update', { roomId, fileId: activeFileId, content: elements })
      }, 500) // Throttled updates to reduce socket traffic
      return () => clearTimeout(timeout)
    }
  }, [elements, activeFileId, roomId, socket])

  useEffect(() => {
    elementsRef.current = Array.isArray(elements) ? elements : []
  }, [elements])

  const colors = ['#000000', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ffffff']

  const drawStrokeOnCanvas = useCallback(
    (startX, startY, endX, endY, color, size, opacity = 1.0) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const isEraser = color === 'eraser'

      ctx.save()
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out'
        ctx.lineWidth = size || 16
      } else {
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = color
        ctx.lineWidth = size || 3
        ctx.globalAlpha = opacity
      }
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(startX, startY)
      ctx.lineTo(endX, endY)
      ctx.stroke()
      ctx.restore()
    },
    [canvasRef]
  )

  const clearCanvasOnly = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }, [canvasRef])

  const redrawPagePaths = useCallback(
    (pageId, elementsList) => {
      clearCanvasOnly()
      const paths = ensureArray(elementsList).filter(
        (el) =>
          el?.type === 'path' && (el.pageId || 'page-1') === pageId && Array.isArray(el.points) && el.points.length > 1
      )
      paths.forEach((path) => {
        for (let i = 1; i < path.points.length; i += 1) {
          const a = path.points[i - 1]
          const b = path.points[i]
          drawStrokeOnCanvas(a.x, a.y, b.x, b.y, path.color || '#000', path.size || 3, path.opacity ?? 1)
        }
      })
    },
    [clearCanvasOnly, drawStrokeOnCanvas]
  )

  // When page changes, show only that page's ink.
  useEffect(() => {
    redrawPagePaths(activePageId, elements)
  }, [activePageId, elements, redrawPagePaths])

  // Sync elements with database / socket cache
  useEffect(() => {
    socket.on('receive-clear-board', () => {
      setElements([])
      const canvas = canvasRef.current
      if (canvas) {
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
      }
      toast.error('Board was cleared by a collaborator')
    })

    socket.on('receive-draw-line', ({ startX, startY, endX, endY, color, size, opacity, pageId }) => {
      // Only live-ink on the page the peer is drawing; full paths arrive via elements sync.
      if (pageId && pageId !== activePageId) return
      drawStrokeOnCanvas(startX, startY, endX, endY, color, size, opacity)
    })

    const onElements = (elementsList) => {
      if (Array.isArray(elementsList)) {
        setElements(elementsList)
        // Reconstruct missing page tabs from element pageIds (multi-page restore)
        setPages((current) => {
          const known = new Set((current || []).map((p) => p.id))
          const next = Array.isArray(current) && current.length > 0 ? [...current] : [{ id: 'page-1', name: 'Page 1' }]
          if (next.length === 0) next.push({ id: 'page-1', name: 'Page 1' })
          let added = false
          for (const el of elementsList) {
            const pid = el?.pageId || 'page-1'
            if (!known.has(pid)) {
              known.add(pid)
              next.push({ id: pid, name: `Page ${next.length + 1}` })
              added = true
            }
          }
          return added ? next : current
        })
      } else {
        console.warn('Warning: received whiteboard elements is not an array:', elementsList)
        setElements([])
      }
    }
    socket.on('receive-whiteboard-elements', onElements)

    const onPages = (payload) => {
      if (Array.isArray(payload?.pages) && payload.pages.length > 0) {
        setPages(payload.pages)
        setActivePageId((current) => {
          if (payload.pages.some((p) => p.id === current)) return current
          if (payload.activePageId && payload.pages.some((p) => p.id === payload.activePageId)) {
            return payload.activePageId
          }
          return payload.pages[0].id
        })
      } else if (Array.isArray(payload) && payload.length > 0) {
        setPages(payload)
      }
    }
    socket.on('receive-whiteboard-pages', onPages)

    return () => {
      socket.off('receive-clear-board')
      socket.off('receive-draw-line')
      socket.off('receive-whiteboard-elements', onElements)
      socket.off('receive-whiteboard-pages', onPages)
    }
  }, [socket, canvasRef, drawStrokeOnCanvas, activePageId])

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    // Adjust mouse coordinate to represent virtual 3000x2000 canvas matching zoom/pan
    const rawX = e.clientX - rect.left
    const rawY = e.clientY - rect.top
    const x = rawX * (canvas.width / rect.width)
    const y = rawY * (canvas.height / rect.height)

    if (whiteboardTool === 'pan') {
      setIsPanning(true)
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
      return
    }

    if (whiteboardTool === 'select') {
      // Clear selection when clicking canvas background
      setSelectedElementId(null)
      return
    }

    if (whiteboardTool === 'sticky') {
      const newSticky = {
        id: generateId('sticky'),
        type: 'sticky',
        x: x - 60,
        y: y - 60,
        width: 130,
        height: 130,
        color: myColor === '#000000' || myColor === 'eraser' ? '#fbf3ab' : `${myColor}30`,
        borderColor: myColor === '#000000' || myColor === 'eraser' ? '#f59e0b' : myColor,
        text: 'New Sticky Note',
        locked: false,
        pageId: activePageId
      }
      saveElementsState([...(Array.isArray(elements) ? elements : []), newSticky])
      setWhiteboardTool('select')
      setSelectedElementId(newSticky.id)
      return
    }

    if (['rect', 'square', 'circle', 'triangle', 'arrow', 'line', 'text', 'image'].includes(whiteboardTool)) {
      let textVal = ''
      let imgVal = ''
      if (whiteboardTool === 'text') {
        textVal = 'Type text here...'
      } else if (whiteboardTool === 'image') {
        imgVal = prompt('Enter Image URL:', 'https://picsum.photos/300/200')
        if (!imgVal) return
      }

      const newElem = {
        id: generateId('elem'),
        type: whiteboardTool,
        x: x - 60,
        y: y - 60,
        width: whiteboardTool === 'text' ? 180 : 120,
        height: whiteboardTool === 'text' ? 50 : 120,
        color: myColor === 'eraser' ? '#3b82f6' : myColor,
        text: textVal,
        src: imgVal,
        locked: false,
        pageId: activePageId
      }
      if (whiteboardTool === 'square') {
        newElem.width = 120
        newElem.height = 120
      }
      saveElementsState([...(Array.isArray(elements) ? elements : []), newElem])
      setWhiteboardTool('select')
      setSelectedElementId(newElem.id)
      return
    }

    // Drawing lines (Pen, Marker, Pencil, Highlighter, Eraser)
    const drawColor = whiteboardTool === 'eraser' ? 'eraser' : myColor
    let activeOpacity = brushOpacity
    if (whiteboardTool === 'highlighter') activeOpacity = 0.35
    else if (whiteboardTool === 'pencil') activeOpacity = 0.6

    strokePointsRef.current = [{ x, y }]
    strokeMetaRef.current = {
      color: drawColor,
      size: whiteboardSize,
      opacity: activeOpacity,
      pageId: activePageId
    }
    setIsDrawing(true)
    setLastPos({ x, y })
  }

  const handleMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
      return
    }

    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    const meta = strokeMetaRef.current || {}
    const drawColor = meta.color || (whiteboardTool === 'eraser' ? 'eraser' : myColor)
    const activeOpacity = meta.opacity ?? 1
    const size = meta.size || whiteboardSize

    drawStrokeOnCanvas(lastPos.x, lastPos.y, x, y, drawColor, size, activeOpacity)
    socket.emit('draw-line', {
      roomId,
      startX: lastPos.x,
      startY: lastPos.y,
      endX: x,
      endY: y,
      color: drawColor,
      size,
      opacity: activeOpacity,
      pageId: activePageId
    })

    strokePointsRef.current.push({ x, y })
    setLastPos({ x, y })
  }

  const handleMouseUp = () => {
    if (isDrawing && strokePointsRef.current.length > 1 && strokeMetaRef.current) {
      const meta = strokeMetaRef.current
      const pathElem = {
        id: generateId('path'),
        type: 'path',
        points: [...strokePointsRef.current],
        color: meta.color,
        size: meta.size,
        opacity: meta.opacity,
        pageId: meta.pageId || activePageId,
        locked: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0
      }
      const next = [...(Array.isArray(elementsRef.current) ? elementsRef.current : []), pathElem]
      saveElementsState(next)
    }
    strokePointsRef.current = []
    strokeMetaRef.current = null
    setIsDrawing(false)
    setIsPanning(false)
  }

  const saveElementsState = (newElements) => {
    const verifiedNew = Array.isArray(newElements) ? newElements : []
    const currentElements = Array.isArray(elements) ? elements : []
    setUndoStack((prev) => [...prev, currentElements])
    setRedoStack([])
    setElements(verifiedNew)
    elementsRef.current = verifiedNew
    onDirtyChange?.(true)
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedNew })
    window.setTimeout(() => onDirtyChange?.(false), 300)
  }

  const handleClear = () => {
    // Only clear the active page — other pages' elements and strokes stay intact.
    const remaining = ensureArray(elements).filter((element) => (element.pageId || 'page-1') !== activePageId)
    setUndoStack((prev) => [...prev, ensureArray(elements)])
    setRedoStack([])
    setElements(remaining)
    elementsRef.current = remaining
    setSelectedElementId(null)
    clearCanvasOnly()
    socket.emit('update-whiteboard-elements', { roomId, elements: remaining })
    // Page-scoped clear on collab layer
    socket.emit('clear-board', { roomId, pageId: activePageId })
    toast.success('This page was cleared')
  }

  const addPage = () => {
    const page = { id: `page-${Date.now()}`, name: `Page ${pages.length + 1}` }
    const nextPages = [...pages, page]
    setPages(nextPages)
    setActivePageId(page.id)
    // Persist page list (Yjs meta) so pages survive leaving the whiteboard
    socket?.emit?.('update-whiteboard-pages', { roomId, pages: nextPages, activePageId: page.id })
    // New page starts blank (no elements inherit; canvas redraws empty for new id).
    clearCanvasOnly()
    toast.success(`${page.name} added (blank)`)
  }

  // Persist active page whenever user switches tabs (helps restore session)
  useEffect(() => {
    if (!socket || !activePageId || !Array.isArray(pages) || pages.length === 0) return
    socket.emit?.('update-whiteboard-pages', { roomId, pages, activePageId })
  }, [activePageId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    const verifiedPrev = Array.isArray(previous) ? previous : []
    const currentElements = Array.isArray(elements) ? elements : []
    setRedoStack((prev) => [...prev, currentElements])
    setElements(verifiedPrev)
    setUndoStack((prev) => prev.slice(0, -1))
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedPrev })
  }, [undoStack, elements, socket, roomId])

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    const verifiedNext = Array.isArray(next) ? next : []
    const currentElements = Array.isArray(elements) ? elements : []
    setUndoStack((prev) => [...prev, currentElements])
    setElements(verifiedNext)
    setRedoStack((prev) => prev.slice(0, -1))
    socket.emit('update-whiteboard-elements', { roomId, elements: verifiedNext })
  }, [redoStack, elements, socket, roomId])

  const undoRef = useRef(handleUndo)
  const redoRef = useRef(handleRedo)

  useEffect(() => {
    undoRef.current = handleUndo
    redoRef.current = handleRedo
  }, [handleUndo, handleRedo])

  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redoRef.current()
        else undoRef.current()
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault()
        redoRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleElementTextChange = (elemId, newText) => {
    const safeElements = Array.isArray(elements) ? elements : []
    const updated = safeElements.map((el) => (el.id === elemId ? { ...el, text: newText } : el))
    saveElementsState(updated)
  }

  // Element actions: lock, duplicate, layers
  const toggleLockElement = (elemId) => {
    const safeElements = Array.isArray(elements) ? elements : []
    const updated = safeElements.map((el) => (el.id === elemId ? { ...el, locked: !el.locked } : el))
    saveElementsState(updated)
  }

  const duplicateElement = (elem) => {
    const newElem = {
      ...elem,
      id: generateId('elem'),
      x: elem.x + 20,
      y: elem.y + 20,
      locked: false
    }
    const safeElements = Array.isArray(elements) ? elements : []
    saveElementsState([...safeElements, newElem])
    setSelectedElementId(newElem.id)
  }

  const deleteElement = (elemId) => {
    const safeElements = Array.isArray(elements) ? elements : []
    const updated = safeElements.filter((el) => el.id !== elemId)
    saveElementsState(updated)
    setSelectedElementId(null)
  }

  const moveLayer = (elemId, direction) => {
    const safeElements = Array.isArray(elements) ? elements : []
    const index = safeElements.findIndex((el) => el.id === elemId)
    if (index === -1) return
    const updated = [...safeElements]
    const [item] = updated.splice(index, 1)

    if (direction === 'front') {
      updated.push(item)
    } else {
      updated.unshift(item)
    }
    saveElementsState(updated)
  }

  const handleElementMouseDown = (e, elem) => {
    if (whiteboardTool !== 'select' || elem.locked) return
    e.stopPropagation()
    setSelectedElementId(elem.id)

    const startX = e.clientX
    const startY = e.clientY
    const startElemX = elem.x
    const startElemY = elem.y

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / (zoom / 100)
      const dy = (moveEvent.clientY - startY) / (zoom / 100)
      setElements((prev) =>
        prev.map((el) => (el.id === elem.id ? { ...el, x: startElemX + dx, y: startElemY + dy } : el))
      )
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      socket.emit('update-whiteboard-elements', { roomId, elements: elementsRef.current })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleResizeMouseDown = (e, elem) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const startW = elem.width
    const startH = elem.height

    const handleMouseMove = (moveEvent) => {
      const dx = (moveEvent.clientX - startX) / (zoom / 100)
      const dy = (moveEvent.clientY - startY) / (zoom / 100)
      setElements((prev) =>
        prev.map((el) =>
          el.id === elem.id
            ? {
                ...el,
                width: Math.max(50, startW + dx),
                height: Math.max(50, startH + dy)
              }
            : el
        )
      )
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      socket.emit('update-whiteboard-elements', { roomId, elements: elementsRef.current })
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card-sunken select-none"
    >
      {/* Top Toolbar */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-danger/10 rounded-lg flex items-center justify-center text-danger shrink-0">
            <Paintbrush className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-text">Whiteboard</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-2 text-muted disabled:opacity-40 hover:bg-primary/10 hover:text-primary rounded-lg"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-2 text-muted disabled:opacity-40 hover:bg-primary/10 hover:text-primary rounded-lg"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Inline Color & Size Picker */}
          <div className="flex items-center gap-2 mr-2">
            {colors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setMyColor(color)}
                style={{ backgroundColor: color }}
                title={color}
                className={`h-5 w-5 rounded-full border cursor-pointer transition-transform hover:scale-110 ${
                  color === '#ffffff' ? 'border-border' : 'border-transparent'
                } ${myColor === color ? 'ring-2 ring-primary ring-offset-1 ring-offset-card' : ''}`}
              />
            ))}
            <input
              type="range"
              min="1"
              max="40"
              value={whiteboardSize}
              onChange={(e) => setWhiteboardSize(parseInt(e.target.value, 10))}
              className="ml-1 w-20 accent-primary cursor-pointer h-1"
              title="Brush size"
            />
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 hover:bg-danger hover:text-white text-danger text-xs font-semibold rounded-xl transition-all cursor-pointer border border-danger/20"
            title="Clear Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
          <button
            onClick={addPage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Add Page"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Page</span>
          </button>
        </div>
      </div>

      <div className="h-10 border-b border-border bg-card px-4 flex items-center gap-2 overflow-x-auto">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            onClick={() => setActivePageId(page.id)}
            className={`h-7 rounded-lg px-3 text-xs font-semibold cursor-pointer border transition-all ${
              activePageId === page.id
                ? 'bg-primary text-white border-primary shadow-sm'
                : 'bg-card border-border text-muted hover:bg-primary/10 hover:text-primary'
            }`}
          >
            {page.name}
          </button>
        ))}
      </div>

      {/* Floating Drawing Tools — essential drawing tools only */}
      <div className="absolute left-3 top-[7.25rem] z-20 mt-0 flex flex-col gap-1.5">
        {[
          { id: 'select', icon: MousePointer2, label: 'Select' },
          { id: 'pen', icon: PenTool, label: 'Pen' },
          { id: 'pencil', icon: Minus, label: 'Pencil' },
          { id: 'highlighter', icon: Sparkles, label: 'Highlighter' },
          { id: 'eraser', icon: Eraser, label: 'Eraser' },
          { id: 'pan', icon: Hand, label: 'Pan canvas' }
        ].map((tool) => {
          const isActive = whiteboardTool === tool.id
          return (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                setWhiteboardTool(tool.id)
                if (tool.id === 'eraser') {
                  setWhiteboardSize(24)
                } else if (tool.id === 'marker') {
                  setWhiteboardSize(10)
                } else if (tool.id === 'highlighter') {
                  setWhiteboardSize(20)
                } else {
                  setWhiteboardSize(3)
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
                isActive
                  ? 'bg-primary text-white'
                  : 'bg-card border border-border text-muted hover:bg-primary/10 hover:text-primary'
              }`}
              title={tool.label}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          )
        })}
      </div>

      {/* Infinite Canvas Container */}
      <div className="flex-1 overflow-hidden flex items-center justify-center relative bg-card-sunken transition-colors">
        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none z-10 opacity-20"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--tw-color-border) 1px, transparent 1px), linear-gradient(to bottom, var(--tw-color-border) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              transform: `translate(${pan.x}px, ${pan.y}px)`
            }}
          />
        )}

        {/* Scaled Canvas Container (Huge 3000x2000 size for Infinite Canvas feel) */}
        <div
          className="relative border border-border rounded-2xl bg-card shadow-card overflow-hidden"
          style={{
            transform: `scale(${zoom / 100}) translate(${pan.x}px, ${pan.y}px)`,
            width: 3000,
            height: 2000,
            minWidth: 3000,
            minHeight: 2000,
            transition: isPanning ? 'none' : 'transform 0.15s ease-out'
          }}
        >
          <canvas
            ref={canvasRef}
            width={3000}
            height={2000}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="cursor-crosshair w-full h-full absolute inset-0"
          />

          {/* Interactive Elements Layer */}
          {ensureArray(elements)
            .filter((elem) => (elem.pageId || 'page-1') === activePageId && elem.type !== 'path')
            .map((elem) => {
              const isSelected = selectedElementId === elem.id
              const isSticky = elem.type === 'sticky'
              const isText = elem.type === 'text'
              const isImage = elem.type === 'image'

              return (
                <div
                  key={elem.id}
                  onMouseDown={(e) => handleElementMouseDown(e, elem)}
                  style={{
                    position: 'absolute',
                    left: elem.x,
                    top: elem.y,
                    width: elem.width,
                    height: elem.height,
                    backgroundColor: isSticky ? elem.color : 'transparent',
                    color: isSticky ? '#1e293b' : 'inherit',
                    borderColor: isSelected ? 'var(--tw-color-primary)' : isSticky ? elem.borderColor : elem.color,
                    borderWidth: isSelected ? '2px' : isSticky || isText || isImage ? '1px' : '2px',
                    borderRadius: elem.type === 'circle' ? '50%' : isSticky ? '12px' : '4px',
                    cursor: elem.locked ? 'not-allowed' : 'move',
                    zIndex: isSelected ? 40 : 10
                  }}
                  className={`flex flex-col items-center justify-center p-2 group shadow-sm transition-all ${
                    isSticky ? 'shadow-md font-sans text-center' : ''
                  }`}
                >
                  {/* Drag Control Overlay for Selected Element */}
                  {isSelected && !elem.locked && (
                    <div className="absolute -top-10 left-0 bg-card border border-border text-text rounded-lg flex items-center p-1.5 gap-1.5 shadow-card pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLockElement(elem.id)
                        }}
                        className="hover:text-primary p-0.5"
                      >
                        <Lock className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          duplicateElement(elem)
                        }}
                        className="hover:text-primary p-0.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          moveLayer(elem.id, 'front')
                        }}
                        className="hover:text-primary p-0.5"
                        title="Bring to Front"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          moveLayer(elem.id, 'back')
                        }}
                        className="hover:text-primary p-0.5"
                        title="Send to Back"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteElement(elem.id)
                        }}
                        className="hover:text-danger p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isSelected && elem.locked && (
                    <div className="absolute -top-10 left-0 bg-card border border-border text-text rounded-lg flex items-center p-1.5 gap-1 shadow-card pointer-events-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleLockElement(elem.id)
                        }}
                        className="text-danger hover:text-danger-hover p-0.5"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] px-1 font-bold">Locked</span>
                    </div>
                  )}

                  {/* Resize Handle */}
                  {isSelected && !elem.locked && (
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(e, elem)}
                      className="absolute bottom-0 right-0 w-3 h-3 bg-primary rounded-bl cursor-se-resize z-50 border border-card"
                    />
                  )}

                  {isImage ? (
                    <img
                      src={elem.src}
                      className="pointer-events-none h-full w-full rounded object-cover"
                      alt="board-insert"
                    />
                  ) : (
                    <div
                      className="relative flex h-full w-full items-center justify-center"
                      style={{
                        background:
                          isSticky || isText
                            ? undefined
                            : elem.fill || 'color-mix(in srgb, var(--tw-primary) 12%, transparent)',
                        borderRadius:
                          elem.type === 'circle' ? '50%' : isSticky ? '12px' : elem.type === 'arrow' ? '2px' : '4px',
                        border:
                          isSticky || isText
                            ? undefined
                            : `${elem.borderWidth || 2}px solid ${elem.borderColor || elem.color || 'var(--tw-primary)'}`,
                        clipPath:
                          elem.type === 'triangle'
                            ? 'polygon(50% 0%, 0% 100%, 100% 100%)'
                            : elem.type === 'arrow'
                              ? 'polygon(0% 30%, 70% 30%, 70% 0%, 100% 50%, 70% 100%, 70% 70%, 0% 70%)'
                              : undefined
                      }}
                    >
                      <textarea
                        value={elem.text || ''}
                        disabled={elem.locked}
                        onChange={(e) => handleElementTextChange(elem.id, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="no-scrollbar h-full w-full resize-none border-none bg-transparent p-2 text-center text-xs font-bold text-text outline-none placeholder-muted/65 focus:ring-0"
                        placeholder={isSticky || isText ? 'Type…' : 'Shape text…'}
                      />
                    </div>
                  )}
                </div>
              )
            })}

          {/* Interactive cursors */}
          {Object.entries(whiteboardCursors).map(([id, cursor]) => (
            <div key={id} className="absolute pointer-events-none z-30" style={{ left: cursor.x, top: cursor.y }}>
              <svg
                className="w-5 h-5 filter drop-shadow-sm select-none"
                viewBox="0 0 24 24"
                fill={cursor.color}
                stroke="white"
                strokeWidth="1.5"
              >
                <path d="M5.653 1.34A1 1 0 0 0 4 2.185v18.63a1 1 0 0 0 1.653.765l6.58-5.639h7.452a1 1 0 0 0 .765-1.653L5.653 1.34Z" />
              </svg>
              <div
                className="absolute left-3 top-3 text-[10px] text-white px-2 py-0.5 rounded-full font-bold shadow-md"
                style={{ backgroundColor: cursor.color }}
              >
                {cursor.user}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
