import pptxgen from 'pptxgenjs'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import TopToolbar from './TopToolbar'
import SidebarThumbnails from './SidebarThumbnails'
import SlideCanvas from './SlideCanvas'
import PresentSlideView from './PresentSlideView'
import PropertiesPanel from './PropertiesPanel'
import useSlideHistory from './hooks/useSlideHistory'
import AiPresentationModal from './AiPresentationModal'
import { collectOpenTextEditorHtml, applyTextEditorFlush, deepCloneSlides } from './utils/flushTextEditors'
import { compressImageToDataUrl } from './utils/compressImage'
import { resolveSlideTheme, defaultObjectColors } from './utils/slideThemes'
import { v4 as uuidv4 } from 'uuid'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

const ensureArray = (arr) => (Array.isArray(arr) ? arr : [])

const nextVisibleIndex = (slides, currentIndex, direction) => {
  let i = currentIndex + direction
  while (i >= 0 && i < slides.length) {
    if (!slides[i]?.hidden) return i
    i += direction
  }
  return currentIndex
}

const reIdElement = (el) => {
  const copy = {
    ...el,
    children: Array.isArray(el?.children) ? el.children.map((c) => ({ ...c })) : el?.children
  }
  copy.id = uuidv4()
  if (Array.isArray(copy.children)) {
    copy.children = copy.children.map((c) => ({ ...c, id: uuidv4() }))
  }
  return copy
}

const createElementFromType = (type, extras = {}, isDarkSlide = false) => {
  const rawType = type === 'text' ? 'textbox' : type
  const colors = defaultObjectColors(isDarkSlide)
  const base = {
    id: uuidv4(),
    x: extras.x ?? 120 + Math.round(Math.random() * 40),
    y: extras.y ?? 100 + Math.round(Math.random() * 40),
    width: 200,
    height: 100,
    rotation: extras.rotation ?? 0,
    opacity: extras.opacity ?? 1,
    zIndex: extras.zIndex ?? Date.now() % 100000
  }

  if (rawType === 'textbox') {
    return {
      ...base,
      type: 'textbox',
      text: extras.text ?? 'Click to edit',
      fontSize: extras.fontSize ?? '24px',
      fontFamily: extras.fontFamily ?? 'Inter, sans-serif',
      fontWeight: extras.fontWeight ?? 'normal',
      fontStyle: extras.fontStyle ?? 'normal',
      textDecoration: extras.textDecoration ?? 'none',
      textAlign: extras.textAlign ?? 'left',
      color: extras.color ?? colors.color,
      fill: extras.fill ?? 'transparent',
      width: extras.width ?? 320,
      height: extras.height ?? 80
    }
  }

  if (rawType === 'shape') {
    const isCircle = extras.shape === 'circle' || extras.borderRadius === 9999
    return {
      ...base,
      type: 'shape',
      fill: extras.fill ?? colors.shapeFill,
      borderWidth: extras.borderWidth ?? 2,
      borderColor: extras.borderColor ?? colors.shapeBorder,
      borderRadius: isCircle ? 9999 : (extras.borderRadius ?? 8),
      width: extras.width ?? (isCircle ? 160 : 220),
      height: extras.height ?? (isCircle ? 160 : 140),
      shape: extras.shape ?? (isCircle ? 'circle' : 'rect'),
      // PowerPoint-like: shapes can hold text
      text: extras.text ?? '',
      fontSize: extras.fontSize ?? '18px',
      fontFamily: extras.fontFamily ?? 'Inter, sans-serif',
      fontWeight: extras.fontWeight ?? 'normal',
      textAlign: extras.textAlign ?? 'center',
      color: extras.color ?? colors.shapeText
    }
  }

  if (rawType === 'image') {
    return {
      ...base,
      type: 'image',
      src: extras.src || 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=400&auto=format&fit=crop',
      width: extras.width ?? 300,
      height: extras.height ?? 200
    }
  }

  if (rawType === 'icon') {
    return {
      ...base,
      type: 'icon',
      icon: extras.icon ?? '★',
      text: extras.icon ?? '★',
      fill: extras.fill ?? 'transparent',
      width: extras.width ?? 72,
      height: extras.height ?? 72,
      fontSize: extras.fontSize ?? '40px',
      // Persist an absolute color so app light/dark chrome never recolors slide icons.
      color: extras.color ?? colors.color ?? '#0f172a'
    }
  }

  return { ...base, ...extras, type: rawType }
}

export default function PresentationModule({
  slides = [],
  setSlides,
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  roomId,
  onPersist
}) {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedElemIds, setSelectedElemIds] = useState([])
  const [editingElemId, setEditingElemId] = useState(null)
  const [activeTool] = useState(null)
  // Slide design is independent of app Light/Dark chrome.
  const [theme, setTheme] = useState(() => resolveSlideTheme('default'))
  const [presentScale, setPresentScale] = useState(1)
  const [presentRevision, setPresentRevision] = useState(0)
  const [presentEntering, setPresentEntering] = useState(false)
  const [clipboard, setClipboard] = useState([])
  const [dragIndex, setDragIndex] = useState(null)
  const [showAiModal, setShowAiModal] = useState(false)

  const slidesRef = useRef(slides)
  const activeSlideRef = useRef(activeSlide)
  const selectedRef = useRef(selectedElemIds)
  const editingRef = useRef(editingElemId)

  const { commit, undo, redo, canUndo, canRedo } = useSlideHistory(slides, setSlides)

  useEffect(() => {
    slidesRef.current = slides
  }, [slides])
  useEffect(() => {
    activeSlideRef.current = activeSlide
  }, [activeSlide])
  useEffect(() => {
    selectedRef.current = selectedElemIds
  }, [selectedElemIds])
  useEffect(() => {
    editingRef.current = editingElemId
  }, [editingElemId])

  useEffect(() => {
    if (!isPresenting) return undefined
    const updateScale = () => {
      // Fit 16:9 slide inside the full viewport (no app chrome)
      const scale = Math.min(window.innerWidth / 850, window.innerHeight / ((850 * 9) / 16)) * 0.96
      setPresentScale(scale)
    }
    updateScale()
    window.addEventListener('resize', updateScale)

    // Signal CSS to hide navbar/sidebar; lock scroll
    const root = document.documentElement
    root.setAttribute('data-presentation-mode', 'true')
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('resize', updateScale)
      root.removeAttribute('data-presentation-mode')
      document.body.style.overflow = prevOverflow
    }
  }, [isPresenting])

  const deckForPresent = ensureArray(slides)

  const selectSlide = useCallback(
    (index) => {
      setActiveSlide(index)
      setSelectedElemIds([])
      setEditingElemId(null)
    },
    [setActiveSlide]
  )

  const activeSlideData = ensureArray(slides)[activeSlide] || { title: 'Blank Slide', elements: [] }
  const activeElementIds = new Set(ensureArray(activeSlideData.elements).map((el) => el.id))
  const effectiveSelectedIds = selectedElemIds.filter((id) => activeElementIds.has(id))
  const selectedElems = activeSlideData.elements?.filter((el) => effectiveSelectedIds.includes(el.id)) || []
  const selectedElem = selectedElems.length === 1 ? selectedElems[0] : null

  /** Structural edits (insert/delete/group) go through undo history. */
  const mapActiveElements = useCallback(
    (mapper, { history = true } = {}) => {
      const apply = (curr) =>
        ensureArray(curr).map((slide, i) => {
          if (i !== activeSlideRef.current) return slide
          return { ...slide, elements: mapper(ensureArray(slide.elements)) }
        })
      try {
        if (history) commit(apply)
        else setSlides(apply)
      } catch (err) {
        console.error('mapActiveElements failed', err)
        try {
          setSlides(apply)
        } catch (e2) {
          console.error(e2)
        }
      }
    },
    [commit, setSlides]
  )

  /** Geometry / text: no undo snapshot (avoids cloning multi‑MB images every drag). */
  const patchElement = useCallback(
    (elementId, updates) => {
      try {
        setSlides((curr) =>
          ensureArray(curr).map((slide, i) => {
            if (i !== activeSlideRef.current) return slide
            return {
              ...slide,
              elements: ensureArray(slide.elements).map((el) => (el.id === elementId ? { ...el, ...updates } : el))
            }
          })
        )
      } catch (err) {
        console.error('patchElement failed', err)
      }
    },
    [setSlides]
  )

  const handleInsertElement = useCallback(
    (type, extras = {}) => {
      const newElement = createElementFromType(type, extras, theme?.isDark)
      mapActiveElements((elements) => [...elements, newElement])
      setSelectedElemIds([newElement.id])
      setEditingElemId(null)
    },
    [mapActiveElements, theme?.isDark]
  )

  const handleDeleteElements = useCallback(
    (elementIds) => {
      if (!elementIds?.length) return
      mapActiveElements((elements) => elements.filter((el) => !elementIds.includes(el.id)))
      setSelectedElemIds([])
      setEditingElemId(null)
    },
    [mapActiveElements]
  )

  const handleDeleteElement = useCallback((elementId) => handleDeleteElements([elementId]), [handleDeleteElements])

  const handleCopy = useCallback(() => {
    const ids = selectedRef.current
    const slide = ensureArray(slidesRef.current)[activeSlideRef.current]
    if (!slide || !ids.length) return
    const copied = ensureArray(slide.elements)
      .filter((el) => ids.includes(el.id))
      .map((el) => ({
        ...el,
        children: Array.isArray(el.children) ? el.children.map((c) => ({ ...c })) : el.children
      }))
    setClipboard(copied)
    try {
      toast.success(`Copied ${copied.length} object${copied.length === 1 ? '' : 's'}`)
    } catch {
      // toast optional
    }
  }, [])

  const handleDuplicate = useCallback(() => {
    const ids = selectedRef.current
    const slide = ensureArray(slidesRef.current)[activeSlideRef.current]
    if (!slide || !ids.length) return
    const selected = ensureArray(slide.elements).filter((el) => ids.includes(el.id))
    const clones = selected.map((el) => {
      const c = reIdElement(el)
      c.x = (el.x || 0) + 24
      c.y = (el.y || 0) + 24
      c.zIndex = (el.zIndex || 0) + 1
      return c
    })
    mapActiveElements((elements) => [...elements, ...clones])
    setSelectedElemIds(clones.map((c) => c.id))
  }, [mapActiveElements])

  const insertImageFromBlob = useCallback(
    async (blob) => {
      if (!blob) return false
      const type = String(blob.type || '')
      if (type && !type.startsWith('image/')) return false
      if (blob.size > 12 * 1024 * 1024) {
        try {
          toast.error('Image must be under 12 MB')
        } catch {
          // ignore
        }
        return false
      }
      try {
        const { dataUrl, width, height } = await compressImageToDataUrl(blob)
        const displayW = Math.min(360, width)
        const displayH = Math.round(displayW * (height / Math.max(1, width)))
        handleInsertElement('image', {
          src: dataUrl,
          width: displayW,
          height: Math.max(80, displayH)
        })
        try {
          toast.success('Image added (compressed for save)')
        } catch {
          // ignore
        }
        return true
      } catch (err) {
        console.error('image compress failed', err)
        try {
          toast.error('Could not process image')
        } catch {
          // ignore
        }
        return false
      }
    },
    [handleInsertElement]
  )

  const handlePasteClipboard = useCallback(async () => {
    // Prefer internal object clipboard
    if (clipboard.length > 0) {
      const clones = clipboard.map((el) => {
        const c = reIdElement(el)
        c.x = (el.x || 0) + 28
        c.y = (el.y || 0) + 28
        return c
      })
      mapActiveElements((elements) => [...elements, ...clones])
      setSelectedElemIds(clones.map((c) => c.id))
      try {
        toast.success('Pasted objects')
      } catch {
        // ignore
      }
      return
    }

    // 1) Prefer image clipboard items (real image, not a file path string)
    try {
      if (navigator.clipboard?.read) {
        const items = await navigator.clipboard.read()
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'))
          if (imageType) {
            const blob = await item.getType(imageType)
            if (await insertImageFromBlob(blob)) return
          }
        }
      }
    } catch {
      // fall through to text / file path handling
    }

    // 2) Text paste — never treat local file paths as image content
    try {
      const text = await navigator.clipboard.readText()
      const trimmed = text?.trim() || ''
      if (!trimmed) {
        try {
          toast.error('Clipboard is empty — copy an image or text first')
        } catch {
          // ignore
        }
        return
      }
      // Looks like a local path or bare filename — prompt to use Pictures instead
      const looksLikePath =
        /^([a-zA-Z]:[\\/]|\\\\|\/|\.\/|\.\.\/)/.test(trimmed) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(trimmed)
      if (looksLikePath && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
        try {
          toast.error('Cannot paste a file path. Use Insert → Pictures, or copy the image itself (not the path).')
        } catch {
          // ignore
        }
        return
      }
      // Remote / data image URL → compress then insert
      if (/^https?:\/\/.+\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(trimmed) || /^data:image\//i.test(trimmed)) {
        try {
          const { dataUrl, width, height } = await compressImageToDataUrl(trimmed)
          const displayW = Math.min(360, width)
          const displayH = Math.round(displayW * (height / Math.max(1, width)))
          handleInsertElement('image', {
            src: dataUrl,
            width: displayW,
            height: Math.max(80, displayH)
          })
          toast.success('Image inserted')
        } catch {
          toast.error('Could not load image from clipboard URL')
        }
        return
      }
      handleInsertElement('textbox', { text: trimmed })
      try {
        toast.success('Pasted as text box')
      } catch {
        // ignore
      }
    } catch {
      try {
        toast.error('Clipboard paste is not available — try Insert → Pictures for images')
      } catch {
        // ignore
      }
    }
  }, [clipboard, mapActiveElements, handleInsertElement, insertImageFromBlob])

  // Capture Ctrl+V image files (OS copy of image / screenshot)
  useEffect(() => {
    if (isPresenting) return undefined
    const onPaste = async (e) => {
      // Let contentEditable handle its own paste
      if (e.target?.isContentEditable) return
      const cd = e.clipboardData
      if (!cd) return

      // Files (image binary)
      if (cd.files?.length) {
        for (const file of Array.from(cd.files)) {
          if (file.type.startsWith('image/')) {
            e.preventDefault()
            await insertImageFromBlob(file)
            return
          }
        }
      }
      // Items
      if (cd.items?.length) {
        for (const item of Array.from(cd.items)) {
          if (item.kind === 'file' && item.type.startsWith('image/')) {
            e.preventDefault()
            const file = item.getAsFile()
            if (file) await insertImageFromBlob(file)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [isPresenting, insertImageFromBlob])

  const handleBringToFront = useCallback(
    (elementIds) => {
      if (!elementIds?.length) return
      mapActiveElements((elements) => {
        const maxZ = Math.max(0, ...elements.map((e) => e.zIndex || 0))
        return elements.map((e) => (elementIds.includes(e.id) ? { ...e, zIndex: maxZ + 1 } : e))
      })
    },
    [mapActiveElements]
  )

  const handleSendToBack = useCallback(
    (elementIds) => {
      if (!elementIds?.length) return
      mapActiveElements((elements) => {
        const minZ = Math.min(0, ...elements.map((e) => e.zIndex || 0))
        return elements.map((e) => (elementIds.includes(e.id) ? { ...e, zIndex: minZ - 1 } : e))
      })
    },
    [mapActiveElements]
  )

  const handleGroup = useCallback(
    (elementIds) => {
      if (!elementIds || elementIds.length < 2) return
      let newGroupId = null
      mapActiveElements((elements) => {
        const elementsToGroup = elements.filter((e) => elementIds.includes(e.id))
        const otherElements = elements.filter((e) => !elementIds.includes(e.id))
        if (elementsToGroup.length < 2) return elements

        const minX = Math.min(...elementsToGroup.map((e) => e.x))
        const minY = Math.min(...elementsToGroup.map((e) => e.y))
        const maxX = Math.max(...elementsToGroup.map((e) => e.x + e.width))
        const maxY = Math.max(...elementsToGroup.map((e) => e.y + e.height))

        newGroupId = uuidv4()
        const groupElement = {
          id: newGroupId,
          type: 'group',
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY,
          zIndex: Math.max(...elementsToGroup.map((e) => e.zIndex || 0), 0) + 1,
          children: elementsToGroup.map((e) => ({
            ...e,
            x: e.x - minX,
            y: e.y - minY
          }))
        }
        return [...otherElements, groupElement]
      })
      if (newGroupId) setSelectedElemIds([newGroupId])
    },
    [mapActiveElements]
  )

  const handleUngroup = useCallback(
    (elementIds) => {
      let unGroupedIds = []
      mapActiveElements((elements) => {
        const newElements = []
        elements.forEach((e) => {
          if (elementIds.includes(e.id) && e.type === 'group') {
            const children = ensureArray(e.children).map((child) => ({
              ...child,
              x: child.x + e.x,
              y: child.y + e.y,
              zIndex: (e.zIndex || 0) + (child.zIndex || 0)
            }))
            newElements.push(...children)
            unGroupedIds.push(...children.map((c) => c.id))
          } else {
            newElements.push(e)
          }
        })
        return newElements
      })
      if (unGroupedIds.length > 0) setSelectedElemIds(unGroupedIds)
    },
    [mapActiveElements]
  )

  const handleFormatFromToolbar = useCallback(
    (updates) => {
      if (!updates) return
      // Prefer live selection state (ref can lag one frame behind setState)
      const ids =
        selectedElemIds.length > 0
          ? selectedElemIds
          : selectedRef.current.length > 0
            ? selectedRef.current
            : editingElemId
              ? [editingElemId]
              : []

      if (updates.deleteMulti) {
        handleDeleteElements(ids)
        return
      }
      if (Array.isArray(updates)) {
        mapActiveElements((elements) => {
          const next = [...elements]
          updates.forEach((update) => {
            const idx = next.findIndex((e) => e.id === update.id)
            if (idx !== -1) next[idx] = { ...next[idx], ...update }
          })
          return next
        })
        return
      }
      if (updates.align === 'front') {
        handleBringToFront(ids)
        return
      }
      if (updates.align === 'back') {
        handleSendToBack(ids)
        return
      }
      if (updates.group) {
        handleGroup(ids)
        return
      }
      if (updates.ungroup) {
        handleUngroup(ids)
        return
      }
      if (ids.length > 0) {
        // Direct patch for font/size/color so styles apply immediately
        mapActiveElements((elements) => elements.map((el) => (ids.includes(el.id) ? { ...el, ...updates } : el)), {
          history: false
        })
      } else if (updates.fontFamily || updates.fontSize || updates.color) {
        try {
          toast.error('Select a text box or shape first, then change font/size')
        } catch {
          // ignore
        }
      }
    },
    [
      selectedElemIds,
      editingElemId,
      handleDeleteElements,
      mapActiveElements,
      handleBringToFront,
      handleSendToBack,
      handleGroup,
      handleUngroup
    ]
  )

  const handleAddSlide = useCallback(() => {
    const newSlide = {
      id: uuidv4(),
      title: 'New Slide',
      elements: [],
      hidden: false
    }
    const nextIndex = ensureArray(slidesRef.current).length
    commit((curr) => [...ensureArray(curr), newSlide])
    setActiveSlide(nextIndex)
    setSelectedElemIds([])
    setEditingElemId(null)
  }, [commit, setActiveSlide])

  const handleImportSlides = useCallback(
    (newSlides) => {
      if (!Array.isArray(newSlides) || newSlides.length === 0) return
      commit(() => newSlides)
      setActiveSlide(0)
      setSelectedElemIds([])
      setEditingElemId(null)
      toast.success('Presentation slides imported!')
    },
    [commit, setActiveSlide]
  )

  const handleInsertAiSlides = useCallback(
    (newSlides, append = false) => {
      if (!Array.isArray(newSlides) || newSlides.length === 0) return
      commit((curr) => {
        if (append) {
          return [...ensureArray(curr), ...newSlides]
        }
        return newSlides
      })
      // If not appending, go to slide 0, otherwise go to first appended slide
      setActiveSlide(append ? ensureArray(slidesRef.current).length : 0)
      setSelectedElemIds([])
      setEditingElemId(null)
    },
    [commit, setActiveSlide]
  )

  const handleDuplicateSlide = useCallback(
    (index) => {
      commit((curr) => {
        const list = ensureArray(curr)
        const slideToCopy = list[index]
        if (!slideToCopy) return list
        const newSlide = {
          ...slideToCopy,
          id: uuidv4(),
          elements: ensureArray(slideToCopy.elements).map(reIdElement)
        }
        const next = [...list]
        next.splice(index + 1, 0, newSlide)
        return next
      })
      setActiveSlide(index + 1)
      setSelectedElemIds([])
      setEditingElemId(null)
    },
    [commit, setActiveSlide]
  )

  const handleDeleteSlide = useCallback(
    (index) => {
      const list = ensureArray(slidesRef.current)
      if (list.length <= 1) return
      commit((curr) => ensureArray(curr).filter((_, i) => i !== index))
      setActiveSlide((prev) => {
        if (prev > index) return prev - 1
        if (prev >= list.length - 1) return list.length - 2
        return prev
      })
      setSelectedElemIds([])
      setEditingElemId(null)
    },
    [commit, setActiveSlide]
  )

  const handleToggleVisibility = useCallback(
    (index) => {
      commit((curr) => ensureArray(curr).map((slide, i) => (i === index ? { ...slide, hidden: !slide.hidden } : slide)))
    },
    [commit]
  )

  const handleChangeTheme = useCallback((nextId) => {
    setTheme(resolveSlideTheme(nextId || 'default'))
  }, [])

  const handleExportPptx = useCallback(async () => {
    const toastId = toast.loading('Exporting PPTX...')
    try {
      const pres = new pptxgen()
      pres.layout = 'LAYOUT_16x9'
      for (const slide of slides) {
        const slideObj = pres.addSlide()
        if (slide.backgroundColor) {
          slideObj.background = { color: slide.backgroundColor.replace('#', '') }
        } else {
          slideObj.background = { color: 'FFFFFF' }
        }
        for (const el of slide.elements || []) {
          const pxToIn = (px) => px / 96
          const opts = {
            x: pxToIn(el.x),
            y: pxToIn(el.y),
            w: pxToIn(el.width),
            h: pxToIn(el.height),
            rotate: el.rotation || 0
          }
          if (el.type === 'textbox' || el.type === 'text') {
            opts.fontSize = (parseInt(el.fontSize) || 24) * 0.75
            opts.color = (el.color || '#000000').replace('#', '')
            if (el.fontFamily) opts.fontFace = el.fontFamily.split(',')[0].replace(/['"]/g, '')
            if (el.bold) opts.bold = true
            if (el.italic) opts.italic = true
            if (el.textAlign) opts.align = el.textAlign
            const textLines = (el.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
            slideObj.addText(textLines, opts)
          } else if (el.type === 'image') {
            if (el.src) {
              if (el.src.startsWith('data:image')) {
                slideObj.addImage({ ...opts, data: el.src })
              } else {
                slideObj.addImage({ ...opts, path: el.src })
              }
            }
          } else if (el.type === 'shape') {
            const shapeMap = {
              rect: pres.ShapeType.rect,
              rounded: pres.ShapeType.roundRect,
              circle: pres.ShapeType.ellipse
            }
            opts.fill = { color: (el.fill || '#000000').replace('#', '') }
            if (el.borderColor) {
              opts.line = { color: el.borderColor.replace('#', ''), width: el.borderWidth || 1 }
            }
            slideObj.addShape(shapeMap[el.shape] || pres.ShapeType.rect, opts)
            if (el.text) {
              const textLines = (el.text || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
              slideObj.addText(textLines, { ...opts, color: 'FFFFFF', align: 'center', valign: 'middle' })
            }
          } else if (el.type === 'icon') {
            opts.fontSize = (parseInt(el.width) || 48) * 0.75
            opts.color = (el.fill || el.color || '#000000').replace('#', '')
            opts.align = 'center'
            opts.valign = 'middle'
            slideObj.addText(el.icon || '★', opts)
          }
        }
      }
      await pres.writeFile({ fileName: `Presentation.pptx` })
      toast.success('Exported to PPTX', { id: toastId })
    } catch (err) {
      console.error(err)
      toast.error('Export failed', { id: toastId })
    }
  }, [slides])

  const enterPresentMode = useCallback(async () => {
    if (presentEntering) return
    setPresentEntering(true)
    try {
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      const htmlById = collectOpenTextEditorHtml()
      let snapshot = deepCloneSlides(applyTextEditorFlush(slidesRef.current, htmlById))
      setSlides(snapshot)
      slidesRef.current = snapshot
      try {
        await onPersist?.(snapshot)
      } catch {
        // offline ok
      }
      const htmlById2 = collectOpenTextEditorHtml()
      if (Object.keys(htmlById2).length > 0) {
        snapshot = deepCloneSlides(applyTextEditorFlush(slidesRef.current, htmlById2))
        setSlides(snapshot)
        slidesRef.current = snapshot
      }
      // Let React commit slide state before flipping present mode
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      setPresentRevision((n) => n + 1)
      setSelectedElemIds([])
      setEditingElemId(null)
      setIsPresenting(true)
    } finally {
      setPresentEntering(false)
    }
  }, [presentEntering, setSlides, onPersist, setIsPresenting])

  const exitPresentMode = useCallback(() => {
    setIsPresenting(false)
  }, [setIsPresenting])

  // Editor keyboard shortcuts
  useEffect(() => {
    if (isPresenting) return undefined

    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase()
      const inField = e.target?.isContentEditable || tag === 'input' || tag === 'textarea' || tag === 'select'

      const mod = e.ctrlKey || e.metaKey

      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey && !inField) {
        e.preventDefault()
        undo()
        return
      }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) && !inField) {
        e.preventDefault()
        redo()
        return
      }
      if (mod && e.key.toLowerCase() === 'c' && !inField) {
        e.preventDefault()
        handleCopy()
        return
      }
      if (mod && e.key.toLowerCase() === 'v' && !inField) {
        e.preventDefault()
        handlePasteClipboard()
        return
      }
      if (mod && e.key.toLowerCase() === 'd' && !inField) {
        e.preventDefault()
        handleDuplicate()
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !inField) {
        if (selectedRef.current.length > 0) {
          e.preventDefault()
          handleDeleteElements(selectedRef.current)
        }
        return
      }
      if (e.key === 'Escape') {
        setSelectedElemIds([])
        setEditingElemId(null)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresenting, undo, redo, handleCopy, handlePasteClipboard, handleDuplicate, handleDeleteElements])

  // Present mode keyboard
  useEffect(() => {
    if (!isPresenting) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setIsPresenting(false)
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setActiveSlide((idx) => nextVisibleIndex(ensureArray(slidesRef.current), idx, 1))
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setActiveSlide((idx) => nextVisibleIndex(ensureArray(slidesRef.current), idx, -1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isPresenting, setActiveSlide, setIsPresenting])

  const handleDragStart = (e, index) => {
    setDragIndex(index)
    try {
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(index))
    } catch {
      // ignore
    }
  }
  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    commit((curr) => {
      const list = [...ensureArray(curr)]
      const [movedSlide] = list.splice(dragIndex, 1)
      list.splice(targetIndex, 0, movedSlide)
      return list
    })
    selectSlide(targetIndex)
    setDragIndex(null)
  }

  const presentSlideData = deckForPresent[activeSlide] || activeSlideData || { title: 'Blank Slide', elements: [] }

  if (isPresenting) {
    // Portal to <body> + data-presentation-mode CSS hides navbar/sidebar completely
    return createPortal(
      <div
        id="presentation-fullscreen-root"
        role="dialog"
        aria-modal="true"
        aria-label="Presentation"
        className="group flex select-none flex-col items-center justify-center bg-black"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100dvh',
          zIndex: 2147483000,
          backgroundColor: '#000000',
          margin: 0,
          padding: 0
        }}
        onClick={() => {
          setActiveSlide(nextVisibleIndex(deckForPresent, activeSlide, 1))
        }}
      >
        <div
          className="relative flex h-full w-full items-center justify-center overflow-hidden"
          style={{ width: '100%', height: '100%' }}
        >
          <PresentSlideView
            key={`slide-${activeSlide}-r${presentRevision}-${presentSlideData?.id || 'x'}`}
            slide={presentSlideData}
            theme={theme}
            presentScale={presentScale}
            revision={presentRevision}
          />
        </div>

        <div
          className="absolute bottom-8 z-[2147483001] flex items-center gap-4 rounded-full border border-white/10 bg-slate-900/80 px-5 py-2.5 opacity-0 shadow-lg backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setActiveSlide(nextVisibleIndex(deckForPresent, activeSlide, -1))}
            disabled={nextVisibleIndex(deckForPresent, activeSlide, -1) === activeSlide}
            className="rounded-full p-1.5 text-white hover:bg-white/20 disabled:opacity-50"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-bold text-white">
            {activeSlide + 1} / {deckForPresent.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveSlide(nextVisibleIndex(deckForPresent, activeSlide, 1))}
            disabled={nextVisibleIndex(deckForPresent, activeSlide, 1) === activeSlide}
            className="rounded-full p-1.5 text-white hover:bg-white/20 disabled:opacity-50"
            aria-label="Next slide"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="mx-2 h-5 w-px bg-white/20" />
          <button
            type="button"
            onClick={exitPresentMode}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white transition-all hover:bg-red-500/80"
          >
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </div>,
      document.body
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card">
      <TopToolbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onInsertElement={handleInsertElement}
        onFormatElement={handleFormatFromToolbar}
        selectedElemId={effectiveSelectedIds.length === 1 ? effectiveSelectedIds[0] : null}
        theme={theme}
        onChangeTheme={handleChangeTheme}
        onPresent={enterPresentMode}
        presentBusy={presentEntering}
        onPasteClipboard={handlePasteClipboard}
        onCopy={handleCopy}
        onDuplicate={handleDuplicate}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        onDeleteSelection={() => handleDeleteElements(effectiveSelectedIds)}
        hasSelection={effectiveSelectedIds.length > 0}
        onImportSlides={handleImportSlides}
        roomId={roomId}
        onAiAssistant={() => setShowAiModal(true)}
        onExportPptx={handleExportPptx}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <SidebarThumbnails
          slides={slides}
          activeSlide={activeSlide}
          setActiveSlide={selectSlide}
          onAddSlide={handleAddSlide}
          onDuplicateSlide={handleDuplicateSlide}
          onDeleteSlide={handleDeleteSlide}
          onToggleVisibility={handleToggleVisibility}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          theme={theme}
        />

        <SlideCanvas
          activeSlideData={activeSlideData}
          isPresenting={false}
          presentScale={1}
          theme={theme}
          activeTool={activeTool}
          selectedElemIds={effectiveSelectedIds}
          setSelectedElemIds={setSelectedElemIds}
          editingElemId={editingElemId}
          setEditingElemId={setEditingElemId}
          onElementDrag={(id, pos) => {
            patchElement(id, {
              x: Number.isFinite(pos?.x) ? pos.x : 0,
              y: Number.isFinite(pos?.y) ? pos.y : 0
            })
          }}
          onElementsDrag={(updatesArray) => {
            mapActiveElements(
              (elements) =>
                elements.map((el) => {
                  const u = updatesArray.find((x) => x.id === el.id)
                  if (!u) return el
                  return {
                    ...el,
                    x: Number.isFinite(u.x) ? u.x : el.x,
                    y: Number.isFinite(u.y) ? u.y : el.y
                  }
                }),
              { history: false }
            )
          }}
          onElementResize={(id, bounds) =>
            patchElement(id, {
              x: Number.isFinite(bounds?.x) ? bounds.x : 0,
              y: Number.isFinite(bounds?.y) ? bounds.y : 0,
              width: Math.max(24, Number(bounds?.width) || 24),
              height: Math.max(24, Number(bounds?.height) || 24)
            })
          }
          onElementRotate={(id, rotation) => patchElement(id, { rotation: Number(rotation) || 0 })}
          onElementDelete={handleDeleteElement}
          onElementsDelete={handleDeleteElements}
          onElementTextChange={(id, text) => {
            patchElement(id, { text })
          }}
          onImageDrop={(src, x, y, w, h) => {
            const newElement = createElementFromType('image', {
              src,
              x: x || 100,
              y: y || 100,
              width: w || 320,
              height: h || 220
            })
            mapActiveElements((elements) => [...elements, newElement])
            setSelectedElemIds([newElement.id])
          }}
          workspaceId={roomId}
        />

        <div className="hidden h-full shrink-0 md:flex">
          <PropertiesPanel
            selectedElems={selectedElems}
            selectedElem={selectedElem}
            onFormatElement={handleFormatFromToolbar}
            onDeleteElement={(id) => handleDeleteElement(id)}
          />
        </div>
      </div>

      <AiPresentationModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        onInsertSlides={handleInsertAiSlides}
      />
    </div>
  )
}
