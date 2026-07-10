import { useState, useEffect, useMemo, useRef } from 'react'
import { ensureArray } from './utils/arrayUtils'
import {
  Presentation,
  Play,
  Plus,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Palette,
  StickyNote,
  Tv,
  Download,
  Image as ImageIcon,
  Video,
  ArrowUp,
  ArrowDown,
  Table2,
  Shapes,
  Upload,
  Eye,
  EyeOff,
  FolderInput
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
  const [showThemePicker, setShowThemePicker] = useState(false)
  const [presenterMode, setPresenterMode] = useState(false)
  const [transitionEffect, setTransitionEffect] = useState('fade')

  // Elements toolbar / states
  const [selectedElemId, setSelectedElemId] = useState(null)
  const [dragSlideIndex, setDragSlideIndex] = useState(null)
  const [dropTargetIndex, setDropTargetIndex] = useState(null)
  const dragIndexRef = useRef(null)

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
      if (isPresenting) {
        if (e.key === 'Escape') {
          setIsPresenting(false)
          setPresenterMode(false)
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault()
          const nextIndex = step(activeSlide, 1)
          setActiveSlide(nextIndex)
          socket.emit('change-slide', { roomId, slideIndex: nextIndex })
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          const prevIndex = step(activeSlide, -1)
          setActiveSlide(prevIndex)
          socket.emit('change-slide', { roomId, slideIndex: prevIndex })
        } else if (e.key === 'F5') {
          e.preventDefault()
          setIsPresenting(true)
        }
      } else if (e.key === 'F5') {
        e.preventDefault()
        const first = ensureArray(slides).findIndex((s) => !s?.hidden)
        if (first >= 0) setActiveSlide(first)
        setIsPresenting(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPresenting, activeSlide, slides, roomId, socket, setActiveSlide, setIsPresenting])

  const activeSlideData = slides[activeSlide] ||
    slides[0] || { title: '', content: '', notes: '', elements: [], layout: 'title' }
  const slideElements = activeSlideData.elements || []

  const handleDuplicateSlide = () => {
    const slideToDuplicate = activeSlideData
    const newSlides = [...slides]
    newSlides.splice(activeSlide + 1, 0, {
      id: `slide-${Math.random().toString(36).slice(2, 10)}`,
      title: slideToDuplicate.title,
      content: slideToDuplicate.content,
      notes: slideToDuplicate.notes || '',
      layout: slideToDuplicate.layout || 'title',
      elements: slideToDuplicate.elements
        ? slideToDuplicate.elements.map((el) => ({
            ...el,
            id: el?.id ? `${el.id}-copy-${Math.random().toString(36).slice(2, 6)}` : `elem-${Math.random().toString(36).slice(2, 9)}`
          }))
        : []
    })
    setSlides(newSlides)
    setActiveSlide(activeSlide + 1)
    socket.emit('change-slide', { roomId, slideIndex: activeSlide + 1 })
    toast.success('Slide duplicated')
  }

  const handleDeleteSlide = () => {
    if (slides.length <= 1) {
      toast.error('Cannot delete the last slide')
      return
    }
    const newSlides = slides.filter((_, i) => i !== activeSlide)
    const newActive = Math.max(0, activeSlide - 1)
    setSlides(newSlides)
    setActiveSlide(newActive)
    socket.emit('change-slide', { roomId, slideIndex: newActive })
    toast.success('Slide deleted')
  }

  const handleMoveSlide = (currentIndex, direction) => {
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= slides.length) return
    reorderSlide(currentIndex, targetIndex)
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

  const assignSection = (index) => {
    const current = slides[index]?.section || ''
    const name = window.prompt('Section name (empty to clear)', current)
    if (name === null) return
    const section = name.trim() || null
    setSlides(slides.map((s, i) => (i === index ? { ...s, section } : s)))
    toast.success(section ? `Section: ${section}` : 'Section cleared')
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

    const handleMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY
      if (mode === 'move') {
        patchElement(elem.id, { x: Math.max(0, origin.x + dx), y: Math.max(0, origin.y + dy) })
      } else if (mode === 'resize') {
        patchElement(elem.id, {
          width: Math.max(40, origin.width + dx),
          height: Math.max(30, origin.height + dy)
        })
      } else if (mode === 'rotate') {
        patchElement(elem.id, { rotation: Math.round(origin.rotation + dx) })
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
    const newElement = {
      id: 'elem-' + Math.random().toString(36).substring(7),
      type: 'textbox',
      x: 120,
      y: 140,
      width: 240,
      height: 100,
      rotation: 0,
      zIndex: 20,
      text: 'Text box',
      color: '#0f172a',
      fontSize: '16px',
      fill: 'rgba(255,255,255,0.9)',
      borderColor: '#94a3b8'
    }
    handleSlideUpdate('elements', [...(activeSlideData.elements || []), newElement])
    setSelectedElemId(newElement.id)
    toast.success('Text box added')
  }

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
      const imgCount = imported.reduce(
        (n, s) => n + (s.elements || []).filter((e) => e.type === 'image').length,
        0
      )
      toast.success(
        `Imported ${imported.length} slide(s)${imgCount ? ` · ${imgCount} image(s)` : ''}`,
        { id: loading }
      )
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

  return (
    <div className="flex-1 flex flex-col bg-card-sunken overflow-hidden h-full relative">
      {/* Presentation Fullscreen */}
      {isPresenting && (
        <div className="fixed inset-0 bg-slate-950 z-[9999] flex flex-col items-center justify-center">
          <button
            onClick={() => {
              setIsPresenting(false)
              setPresenterMode(false)
            }}
            className="absolute top-4 right-4 p-2.5 bg-card/10 hover:bg-card/20 text-on-primary rounded-full transition-all cursor-pointer z-50"
            title="Exit Slideshow (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          {presenterMode ? (
            <div className="w-[90vw] h-[85vh] flex gap-6">
              {/* Presenter Split Screen View */}
              <div className="flex-1 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between">
                <span className="text-[10px] font-bold tracking-wider text-muted uppercase">Current Slide</span>
                <div
                  className={`aspect-[16/9] w-full bg-gradient-to-br ${theme.gradient} rounded-xl p-8 flex flex-col justify-center text-center relative border border-white/5 overflow-hidden`}
                >
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-on-primary mb-4">
                    {activeSlideData.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-xs md:text-sm text-muted leading-relaxed max-w-md mx-auto">
                    {activeSlideData.content}
                  </p>
                </div>
                <div className="text-xs text-on-primary/50">
                  Slide {activeSlide + 1} of {slides.length}
                </div>
              </div>

              <div className="w-96 bg-black/40 rounded-2xl p-6 border border-white/5 flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-muted uppercase block mb-3">
                    Speaker Notes
                  </span>
                  <div className="bg-card/5 border border-white/10 rounded-xl p-4 min-h-[150px] text-xs text-slate-200 leading-relaxed overflow-y-auto">
                    {activeSlideData.notes || 'No notes added to this slide.'}
                  </div>
                </div>

                <div className="flex-1 border-t border-white/10 pt-4 flex flex-col justify-between">
                  <span className="text-[10px] font-bold tracking-wider text-muted uppercase">Up Next</span>
                  {slides[activeSlide + 1] ? (
                    <div className="p-3 bg-card/5 rounded-xl border border-white/5 text-left">
                      <p className="font-bold text-xs text-on-primary">{slides[activeSlide + 1].title}</p>
                      <p className="text-[10px] text-muted truncate mt-1">{slides[activeSlide + 1].content}</p>
                    </div>
                  ) : (
                    <p className="italic text-[10px] text-muted text-center py-4">End of Slide Presentation</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-[85vw] max-w-5xl aspect-[16/9] overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide}
                  {...getSlideTransition()}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className={`w-full h-full bg-gradient-to-br ${theme.gradient} rounded-2xl p-12 md:p-20 shadow-2xl flex flex-col justify-center items-center text-center relative border border-white/5 overflow-hidden`}
                >
                  <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${theme.accent} rounded-t-2xl`} />
                  <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-on-primary mb-6 leading-tight select-none">
                    {activeSlideData.title || 'Untitled Slide'}
                  </h1>
                  <p className="text-lg md:text-2xl text-slate-200 max-w-2xl leading-relaxed select-none">
                    {activeSlideData.content}
                  </p>

                  {/* Absolute Elements on Presentation Screen */}
                  {ensureArray(slideElements).map((el) => (
                    <div
                      key={el.id}
                      style={{
                        position: 'absolute',
                        left: el.x,
                        top: el.y,
                        width: el.width,
                        height: el.height,
                        zIndex: 10
                      }}
                    >
                      {el.type === 'image' ? (
                        <img src={el.src} className="w-full h-full object-cover rounded shadow" alt="slide-elem" />
                      ) : el.type === 'video' ? (
                        <iframe
                          src={el.src}
                          className="w-full h-full rounded shadow"
                          title="slide-video"
                          frameBorder="0"
                        />
                      ) : el.type === 'shape' ? (
                        <div className="w-full h-full bg-indigo-500/35 rounded-full border-2 border-indigo-500" />
                      ) : el.type === 'table' ? (
                        <table className="w-full h-full border border-slate-300 text-slate-800 text-[10px] bg-card">
                          <tbody>
                            <tr>
                              <td className="border p-1">Row Cell</td>
                              <td className="border p-1">Row Cell</td>
                            </tr>
                            <tr>
                              <td className="border p-1">Row Cell</td>
                              <td className="border p-1">Row Cell</td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <div className="w-full h-full border border-dashed border-slate-300" />
                      )}
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Navigation Controls floating panel */}
          <div className="absolute bottom-8 flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-50">
            <button
              type="button"
              onClick={() => {
                const prevIndex = nextVisibleIndex(activeSlide, -1)
                setActiveSlide(prevIndex)
                socket.emit('change-slide', { roomId, slideIndex: prevIndex })
              }}
              disabled={nextVisibleIndex(activeSlide, -1) === activeSlide}
              className="cursor-pointer rounded-full p-1.5 text-on-primary/80 transition-all hover:bg-card/15 hover:text-on-primary disabled:opacity-35"
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
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="w-px h-5 bg-card/10" />
            <button
              onClick={() => setPresenterMode(!presenterMode)}
              className="flex items-center gap-1.5 px-3 py-1 bg-card/10 hover:bg-card/20 text-on-primary rounded-full text-[10px] font-bold transition-all cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Presenter Mode</span>
            </button>
          </div>
        </div>
      )}

      {/* Slide Editor Topbar */}
      <div className="h-12 border-b border-border bg-card px-4 flex items-center justify-between shrink-0 transition-colors z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-warning/10 rounded-lg flex items-center justify-center text-warning shrink-0">
            <Presentation className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm text-text">Pitch Presentation</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={addSlide}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border border-border text-text hover:bg-primary/10 hover:text-primary rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Slide</span>
          </button>
          <button
            onClick={handleDuplicateSlide}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleDeleteSlide}
            className="p-2 text-muted hover:text-danger rounded-lg hover:bg-danger/10 cursor-pointer"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Elements insertions */}
          <button
            onClick={() => addElementToSlide('image')}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => addElementToSlide('video')}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Insert Video"
          >
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={() => addElementToSlide('shape')}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Insert Shape"
          >
            <Shapes className="w-4 h-4" />
          </button>
          <button
            onClick={() => addElementToSlide('table')}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Insert Table"
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={addTextBoxToSlide}
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Insert Text Box"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <label
            className="p-2 text-muted hover:text-primary rounded-lg hover:bg-primary/10 cursor-pointer"
            title="Import PPTX"
          >
            <Upload className="w-4 h-4" />
            <input
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleImportPptx(f)
                e.target.value = ''
              }}
            />
          </label>

          <div className="w-px h-5 bg-border mx-0.5" />

          {/* Theme Picker */}
          <div className="relative">
            <button
              onClick={() => setShowThemePicker(!showThemePicker)}
              className={`p-2 rounded-lg cursor-pointer ${showThemePicker ? 'bg-primary/10 text-primary' : 'text-muted hover:text-primary'}`}
              title="Theme Color"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowThemePicker(false)} />
                <div className="absolute top-full right-0 mt-2 bg-card border border-border rounded-xl shadow-card z-50 p-3 min-w-[200px]">
                  <span className="text-xs font-semibold text-muted mb-2 block">Slides Theme</span>
                  <div className="space-y-1.5">
                    {SLIDE_THEMES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setSelectedTheme(t.id)
                          setShowThemePicker(false)
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium ${selectedTheme === t.id ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-primary/10 hover:text-primary'}`}
                      >
                        <div className={`w-6 h-4 rounded bg-gradient-to-r ${t.accent}`} />
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Transition settings */}
          <select
            value={transitionEffect}
            onChange={(e) => setTransitionEffect(e.target.value)}
            className="bg-card-sunken text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-border text-text cursor-pointer focus:border-primary"
            title="Slide Transition Effect"
          >
            <option value="fade">Fade Transition</option>
            <option value="slide">Slide Transition</option>
            <option value="zoom">Zoom Transition</option>
            <option value="flip">Flip Transition</option>
            <option value="rise">Rise Transition</option>
            <option value="wipe">Wipe Transition</option>
          </select>

          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`p-2 rounded-lg cursor-pointer ${showNotes ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-primary/10 hover:text-primary'}`}
            title="Speaker Notes"
          >
            <StickyNote className="w-4 h-4" />
          </button>
          <button
            onClick={handleExportDeckOutline}
            className="p-2 text-muted hover:text-primary rounded-lg cursor-pointer"
            title="Export PPTX Outline"
          >
            <Download className="w-4 h-4" />
          </button>

          <div className="w-px h-5 bg-border mx-0.5" />

          <button
            onClick={() => {
              setIsPresenting(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold rounded-xl cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Present</span>
          </button>
        </div>
      </div>

      {/* Main slide layout: only thumbnail rail scrolls (PowerPoint-style) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Thumbnails Sidebar */}
        <div className="flex w-52 shrink-0 flex-col border-r border-border bg-card">
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
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

                    <div className="absolute -left-0.5 top-5 z-40 hidden flex-col gap-0.5 rounded border border-border bg-card-sunken p-0.5 text-text group-hover:flex">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => handleMoveSlide(i, 'up')}
                        className="p-0.5 hover:text-primary disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={i === slides.length - 1}
                        onClick={() => handleMoveSlide(i, 'down')}
                        className="p-0.5 hover:text-primary disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleHideSlide(i)}
                        className="p-0.5 hover:text-primary"
                        title={s.hidden ? 'Show in slideshow' : 'Hide from slideshow'}
                      >
                        {s.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => assignSection(i)}
                        className="p-0.5 hover:text-primary"
                        title="Assign section"
                      >
                        <FolderInput className="h-3 w-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveSlide(i)
                        socket.emit('change-slide', { roomId, slideIndex: i })
                      }}
                      className={`relative flex aspect-[16/9] flex-1 cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-3 text-left ${theme.gradient} ${
                        isActive ? 'border-warning ring-2 ring-warning/20' : 'border-border hover:border-muted'
                      } ${s.hidden ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${theme.accent}`} />
                      <div className="flex w-full items-start justify-between gap-1">
                        <div className="truncate text-[9px] font-bold text-text">{s.title || 'Untitled'}</div>
                        {s.hidden && (
                          <EyeOff className="h-3 w-3 shrink-0 text-muted" title="Hidden" />
                        )}
                      </div>
                      <div className="mt-1 line-clamp-2 text-[7px] leading-snug text-muted">{s.content}</div>

                      {usersHere.length > 0 && (
                        <div className="absolute bottom-1 right-1 z-10 flex -space-x-1.5 overflow-hidden p-0.5">
                          {ensureArray(usersHere).map((u, uIdx) => (
                            <img
                              key={uIdx}
                              className="inline-block h-4 w-4 rounded-full border bg-card object-cover"
                              src={u.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'}
                              alt={u.user}
                              title={u.user}
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

        {/* Editor Screen — fixed viewport, no growth/scroll with new slides */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card-sunken">
          <div className="flex h-9 shrink-0 select-none items-center gap-3 border-b border-border bg-card px-6">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Slide Layout:</span>
            {['title', 'split', 'image-left', 'normal'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleSlideUpdate('layout', l)}
                className={`cursor-pointer rounded-lg border px-3 py-0.5 text-[10px] font-bold capitalize ${
                  activeSlideData.layout === l
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-card text-muted hover:bg-primary/10 hover:text-primary'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-4 md:p-6">
            <div
              className={`relative flex aspect-[16/9] w-full max-w-4xl max-h-full flex-col justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br p-6 shadow-card md:p-10 ${theme.gradient}`}
            >
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme.accent} rounded-t-3xl`} />

              {/* Dynamic templates */}
              {activeSlideData.layout === 'title' ? (
                <div className="flex flex-col justify-center items-center h-full text-center">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-4xl font-bold text-text border-b border-transparent focus:border-primary outline-none w-full text-center bg-transparent py-2"
                    placeholder="Enter Title"
                  />
                  <textarea
                    value={activeSlideData.content || ''}
                    onChange={(e) => handleSlideUpdate('content', e.target.value)}
                    className="text-base text-muted outline-none w-full text-center bg-transparent py-2 resize-none mt-4 h-24"
                    placeholder="Enter subtitle details..."
                  />
                </div>
              ) : activeSlideData.layout === 'split' ? (
                <div className="h-full flex flex-col">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-2xl font-bold text-text border-b border-transparent focus:border-primary outline-none bg-transparent py-1 w-full text-center"
                    placeholder="Enter Title"
                  />
                  <div className="grid grid-cols-2 gap-6 flex-1 mt-6">
                    <textarea
                      value={activeSlideData.content || ''}
                      onChange={(e) => handleSlideUpdate('content', e.target.value)}
                      className="border border-dashed border-border rounded-xl p-3 text-xs bg-transparent resize-none h-full outline-none focus:border-primary"
                      placeholder="Column 1 text..."
                    />
                    <textarea
                      value={activeSlideData.splitContent2 || ''}
                      onChange={(e) => handleSlideUpdate('splitContent2', e.target.value)}
                      className="border border-dashed border-border rounded-xl p-3 text-xs bg-transparent resize-none h-full outline-none focus:border-primary"
                      placeholder="Column 2 text..."
                    />
                  </div>
                </div>
              ) : activeSlideData.layout === 'image-left' ? (
                <div className="h-full flex gap-6 items-center">
                  <div className="w-1/2 aspect-[4/3] bg-card-sunken rounded-2xl flex flex-col items-center justify-center border border-dashed border-border text-muted text-xs">
                    {activeSlideData.elements?.some((el) => el.type === 'image') ? (
                      <img
                        src={activeSlideData.elements.find((el) => el.type === 'image').src}
                        className="w-full h-full object-cover rounded-2xl"
                        alt="slide-left"
                      />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <span>Insert Image element to preview</span>
                      </>
                    )}
                  </div>
                  <div className="w-1/2 flex flex-col justify-center gap-3">
                    <input
                      type="text"
                      value={activeSlideData.title || ''}
                      onChange={(e) => handleSlideUpdate('title', e.target.value)}
                      className="text-2xl font-bold text-text outline-none bg-transparent"
                      placeholder="Title"
                    />
                    <textarea
                      value={activeSlideData.content || ''}
                      onChange={(e) => handleSlideUpdate('content', e.target.value)}
                      className="text-xs text-muted bg-transparent resize-none h-32 outline-none focus:border-primary"
                      placeholder="Content text..."
                    />
                  </div>
                </div>
              ) : (
                // Normal layout
                <div className="h-full flex flex-col">
                  <input
                    type="text"
                    value={activeSlideData.title || ''}
                    onChange={(e) => handleSlideUpdate('title', e.target.value)}
                    className="text-2xl font-bold text-text border-b border-transparent focus:border-primary outline-none bg-transparent py-1 w-full"
                    placeholder="Click to add title"
                  />
                  <textarea
                    value={activeSlideData.content || ''}
                    onChange={(e) => handleSlideUpdate('content', e.target.value)}
                    className="flex-1 text-sm text-muted bg-transparent resize-none mt-4 outline-none focus:border-primary"
                    placeholder="Click to add body content..."
                  />
                </div>
              )}

              {/* Absolute elements: move / resize / rotate / edit */}
              {ensureArray(slideElements).map((el) => {
                const isSelected = selectedElemId === el.id
                return (
                  <div
                    key={el.id}
                    onMouseDown={(e) => handleElementDrag(e, el, 'move')}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      zIndex: isSelected ? 40 : el.zIndex || 10,
                      transform: `rotate(${el.rotation || 0}deg)`,
                      background:
                        el.type === 'textbox' || el.type === 'shape'
                          ? el.fill || 'rgba(255,255,255,0.85)'
                          : undefined,
                      borderColor: el.borderColor || el.color
                    }}
                    className={`relative select-none cursor-move border ${isSelected ? 'border-primary ring-2 ring-primary/25' : 'border-transparent hover:border-muted'}`}
                  >
                    {(el.type === 'textbox' || el.type === 'shape' || el.type === 'text') && (
                      <textarea
                        value={el.text || ''}
                        onChange={(e) => patchElement(el.id, { text: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-full w-full resize-none border-none bg-transparent p-2 text-sm outline-none"
                        style={{ color: el.color || '#0f172a', fontSize: el.fontSize || '14px' }}
                        placeholder="Type…"
                      />
                    )}
                    {isSelected && (
                      <>
                        <div
                          className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-se-resize rounded-sm bg-primary"
                          onMouseDown={(e) => handleElementDrag(e, el, 'resize')}
                        />
                        <div
                          className="absolute -top-1.5 left-1/2 h-3 w-3 -translate-x-1/2 cursor-grab rounded-full bg-primary"
                          onMouseDown={(e) => handleElementDrag(e, el, 'rotate')}
                        />
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          deleteElement(el.id)
                        }}
                        className="absolute -top-6 -right-6 z-50 cursor-pointer rounded-full bg-danger p-1 text-on-primary hover:bg-danger-hover"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                      </>
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
                        className="w-full h-full rounded pointer-events-none"
                        title="deck-video"
                        frameBorder="0"
                      />
                    ) : el.type === 'shape' ? (
                      <div className="w-full h-full bg-primary/35 rounded-full border-2 border-primary pointer-events-none" />
                    ) : el.type === 'table' ? (
                      <table className="w-full h-full border border-border text-text text-[10px] bg-card pointer-events-none">
                        <tbody>
                          <tr>
                            <td className="border p-1">Row Cell</td>
                            <td className="border p-1">Row Cell</td>
                          </tr>
                          <tr>
                            <td className="border p-1">Row Cell</td>
                            <td className="border p-1">Row Cell</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <div className="w-full h-full border border-dashed border-border" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Speaker notes */}
          {showNotes && (
            <div className="h-32 border-t border-border bg-card p-4 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-3.5 h-3.5 text-muted" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Speaker Notes</span>
              </div>
              <textarea
                value={activeSlideData.notes || ''}
                onChange={(e) => handleSlideUpdate('notes', e.target.value)}
                placeholder="Add private presenter notes for this slide..."
                className="w-full h-16 bg-card-sunken border border-border rounded-lg px-3 py-2 text-xs text-text placeholder-muted/65 focus:outline-none focus:border-primary resize-none font-sans"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
