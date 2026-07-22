import { useState, useEffect, useCallback } from 'react'
import TopToolbar from './TopToolbar'
import SidebarThumbnails from './SidebarThumbnails'
import SlideCanvas from './SlideCanvas'
import PropertiesPanel from './PropertiesPanel'
import { v4 as uuidv4 } from 'uuid'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

// Helper to ensure valid array
const ensureArray = (arr) => (Array.isArray(arr) ? arr : [])

// Helper for presentation mode
const nextVisibleIndex = (slides, currentIndex, direction) => {
  let i = currentIndex + direction
  while (i >= 0 && i < slides.length) {
    if (!slides[i]?.hidden) return i
    i += direction
  }
  return currentIndex
}

export default function PresentationModule({
  slides = [],
  setSlides,
  activeSlide,
  setActiveSlide,
  isPresenting,
  setIsPresenting,
  roomId
}) {
  const [activeTab, setActiveTab] = useState('home')
  const [selectedElemIds, setSelectedElemIds] = useState([])
  const [editingElemId, setEditingElemId] = useState(null)
  const [activeTool] = useState(null)
  const [theme, setTheme] = useState({ gradient: 'from-white to-slate-50', accent: 'from-primary to-indigo-500' })
  const [presentScale, setPresentScale] = useState(1)

  // Scale for presenting
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

  // Slide state handlers
  const activeSlideData = ensureArray(slides)[activeSlide] || { title: 'Blank Slide', elements: [] }
  const selectedElems = activeSlideData.elements?.filter((el) => selectedElemIds.includes(el.id)) || []
  const selectedElem = selectedElems.length === 1 ? selectedElems[0] : null

  const handleAddSlide = () => {
    const newSlide = {
      id: uuidv4(),
      title: 'New Slide',
      elements: [],
      hidden: false
    }
    setSlides((curr) => [...ensureArray(curr), newSlide])
    setActiveSlide(slides.length)
  }

  const handleDuplicateSlide = (index) => {
    const slideToCopy = ensureArray(slides)[index]
    if (!slideToCopy) return
    const newSlide = JSON.parse(JSON.stringify(slideToCopy))
    newSlide.id = uuidv4()
    const newSlides = [...ensureArray(slides)]
    newSlides.splice(index + 1, 0, newSlide)
    setSlides(newSlides)
    setActiveSlide(index + 1)
  }

  const handleDeleteSlide = (index) => {
    if (slides.length <= 1) return
    const newSlides = ensureArray(slides).filter((_, i) => i !== index)
    setSlides(newSlides)
    if (activeSlide >= newSlides.length) setActiveSlide(newSlides.length - 1)
  }

  const handleToggleVisibility = (index) => {
    const newSlides = [...ensureArray(slides)]
    newSlides[index].hidden = !newSlides[index].hidden
    setSlides(newSlides)
  }

  // Element state handlers
  const updateElement = useCallback((elementId, updates) => {
    setSlides((curr) => {
      return ensureArray(curr).map((slide, i) => {
        if (i !== activeSlide) return slide
        return {
          ...slide,
          elements: ensureArray(slide.elements).map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          )
        }
      })
    })
  }, [activeSlide, setSlides])

  const updateElements = useCallback((elementIds, updates) => {
    setSlides((curr) => {
      return ensureArray(curr).map((slide, i) => {
        if (i !== activeSlide) return slide
        return {
          ...slide,
          elements: ensureArray(slide.elements).map((el) =>
            elementIds.includes(el.id) ? { ...el, ...updates } : el
          )
        }
      })
    })
  }, [activeSlide, setSlides])

  const handleInsertElement = (type) => {
    const newElement = {
      id: uuidv4(),
      type,
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      rotation: 0,
      opacity: 1
    }
    
    if (type === 'textbox') {
      newElement.text = 'Click to edit'
      newElement.fontSize = '24px'
      newElement.color = '#000000'
    } else if (type === 'shape') {
      newElement.fill = '#e2e8f0'
      newElement.borderWidth = 2
      newElement.borderColor = '#94a3b8'
      newElement.borderRadius = 8
    } else if (type === 'image') {
      newElement.src = 'https://images.unsplash.com/photo-1707343843437-caacff5cfa74?q=80&w=400&auto=format&fit=crop'
    }

    setSlides((curr) => {
      return ensureArray(curr).map((slide, i) => {
        if (i !== activeSlide) return slide
        return {
          ...slide,
          elements: [...ensureArray(slide.elements), newElement]
        }
      })
    })
    setSelectedElemIds([newElement.id])
  }

  const handleDeleteElement = useCallback((elementId) => {
    setSlides((curr) => {
      return ensureArray(curr).map((slide, i) => {
        if (i !== activeSlide) return slide
        return {
          ...slide,
          elements: ensureArray(slide.elements).filter((el) => el.id !== elementId)
        }
      })
    })
    setSelectedElemIds((prev) => prev.filter(id => id !== elementId))
  }, [activeSlide, setSlides])

  const handleDeleteElements = useCallback((elementIds) => {
    setSlides((curr) => {
      return ensureArray(curr).map((slide, i) => {
        if (i !== activeSlide) return slide
        return {
          ...slide,
          elements: ensureArray(slide.elements).filter((el) => !elementIds.includes(el.id))
        }
      })
    })
    setSelectedElemIds([])
  }, [activeSlide, setSlides])

  const handleBringToFront = useCallback((elementIds) => {
    setSlides((curr) => ensureArray(curr).map((slide, i) => {
      if (i !== activeSlide) return slide
      const maxZ = Math.max(0, ...slide.elements.map(e => e.zIndex || 0))
      return {
        ...slide,
        elements: slide.elements.map(e => elementIds.includes(e.id) ? { ...e, zIndex: maxZ + 1 } : e)
      }
    }))
  }, [activeSlide, setSlides])

  const handleSendToBack = useCallback((elementIds) => {
    setSlides((curr) => ensureArray(curr).map((slide, i) => {
      if (i !== activeSlide) return slide
      const minZ = Math.min(0, ...slide.elements.map(e => e.zIndex || 0))
      return {
        ...slide,
        elements: slide.elements.map(e => elementIds.includes(e.id) ? { ...e, zIndex: minZ - 1 } : e)
      }
    }))
  }, [activeSlide, setSlides])

  const handleGroup = useCallback((elementIds) => {
    if (elementIds.length < 2) return
    let newGroupId = null
    setSlides((curr) => ensureArray(curr).map((slide, i) => {
      if (i !== activeSlide) return slide
      const elementsToGroup = slide.elements.filter(e => elementIds.includes(e.id))
      const otherElements = slide.elements.filter(e => !elementIds.includes(e.id))
      if (elementsToGroup.length < 2) return slide

      const minX = Math.min(...elementsToGroup.map(e => e.x))
      const minY = Math.min(...elementsToGroup.map(e => e.y))
      const maxX = Math.max(...elementsToGroup.map(e => e.x + e.width))
      const maxY = Math.max(...elementsToGroup.map(e => e.y + e.height))

      newGroupId = uuidv4()
      const groupElement = {
        id: newGroupId,
        type: 'group',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        children: elementsToGroup.map(e => ({
          ...e,
          x: e.x - minX,
          y: e.y - minY
        }))
      }

      return {
        ...slide,
        elements: [...otherElements, groupElement]
      }
    }))
    if (newGroupId) setSelectedElemIds([newGroupId])
  }, [activeSlide, setSlides])

  const handleUngroup = useCallback((elementIds) => {
    let unGroupedIds = []
    setSlides((curr) => ensureArray(curr).map((slide, i) => {
      if (i !== activeSlide) return slide
      const newElements = []
      slide.elements.forEach(e => {
        if (elementIds.includes(e.id) && e.type === 'group') {
          const children = e.children.map(child => ({
            ...child,
            x: child.x + e.x,
            y: child.y + e.y,
            zIndex: (e.zIndex || 0) + (child.zIndex || 0)
          }))
          newElements.push(...children)
          unGroupedIds.push(...children.map(c => c.id))
        } else {
          newElements.push(e)
        }
      })
      return {
        ...slide,
        elements: newElements
      }
    }))
    if (unGroupedIds.length > 0) setSelectedElemIds(unGroupedIds)
  }, [activeSlide, setSlides])

  // DND Handlers (Simple reorder)
  const [dragIndex, setDragIndex] = useState(null)
  
  const handleDragStart = (e, index) => {
    setDragIndex(index)
  }
  const handleDragOver = (e) => {
    e.preventDefault()
  }
  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === targetIndex) return
    const newSlides = [...slides]
    const [movedSlide] = newSlides.splice(dragIndex, 1)
    newSlides.splice(targetIndex, 0, movedSlide)
    setSlides(newSlides)
    setDragIndex(null)
    setActiveSlide(targetIndex)
  }

  if (isPresenting) {
    return (
      <div
        className="fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center select-none group"
        onClick={() => {
          const nextIndex = nextVisibleIndex(slides, activeSlide, 1)
          setActiveSlide(nextIndex)
        }}
      >
        <div className="relative w-full h-full max-w-[100vw] max-h-[100vh] aspect-video overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="w-full h-full flex items-center justify-center"
            >
              <SlideCanvas 
                 activeSlideData={activeSlideData}
                 isPresenting={true}
                 presentScale={presentScale}
                 theme={theme}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Presenter Controls */}
        <div
          className="absolute bottom-8 flex items-center gap-4 bg-slate-900/60 backdrop-blur-md px-5 py-2.5 rounded-full border border-white/10 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setActiveSlide(nextVisibleIndex(slides, activeSlide, -1))}
            disabled={nextVisibleIndex(slides, activeSlide, -1) === activeSlide}
            className="p-1.5 text-white hover:bg-white/20 rounded-full disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white text-sm font-bold">{activeSlide + 1} / {slides.length}</span>
          <button
            onClick={() => setActiveSlide(nextVisibleIndex(slides, activeSlide, 1))}
            disabled={nextVisibleIndex(slides, activeSlide, 1) === activeSlide}
            className="p-1.5 text-white hover:bg-white/20 rounded-full disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="w-px h-5 bg-white/20 mx-2" />
          <button
            onClick={() => setIsPresenting(false)}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-red-500/80 text-white rounded-full text-xs font-bold transition-all"
          >
            <X className="w-3.5 h-3.5" /> Exit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-card">
      <TopToolbar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onInsertElement={handleInsertElement}
        onFormatElement={(updates) => {
          if (updates.deleteMulti) {
            handleDeleteElements(selectedElemIds)
          } else if (Array.isArray(updates)) {
            setSlides((curr) => ensureArray(curr).map((slide, i) => {
              if (i !== activeSlide) return slide
              const elements = [...slide.elements]
              updates.forEach(update => {
                const idx = elements.findIndex(e => e.id === update.id)
                if (idx !== -1) elements[idx] = { ...elements[idx], ...update }
              })
              return { ...slide, elements }
            }))
          } else if (updates.align === 'front') {
            handleBringToFront(selectedElemIds)
          } else if (updates.align === 'back') {
            handleSendToBack(selectedElemIds)
          } else if (updates.group) {
            handleGroup(selectedElemIds)
          } else if (updates.ungroup) {
            handleUngroup(selectedElemIds)
          } else if (selectedElemIds.length > 0) {
            updateElements(selectedElemIds, updates)
          }
        }}
        selectedElemId={selectedElemIds.length === 1 ? selectedElemIds[0] : null}
        theme={theme}
        onChangeTheme={(themeType) => {
           if (themeType === 'default') setTheme({ gradient: 'from-slate-100 to-slate-200', accent: 'from-slate-500 to-slate-600' })
        }}
        onPresent={() => setIsPresenting(true)}
      />
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <SidebarThumbnails 
          slides={slides}
          activeSlide={activeSlide}
          setActiveSlide={setActiveSlide}
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
          selectedElemIds={selectedElemIds}
          setSelectedElemIds={setSelectedElemIds}
          editingElemId={editingElemId}
          setEditingElemId={setEditingElemId}
          onElementDrag={(id, pos) => updateElement(id, pos)}
          onElementsDrag={(updatesArray) => {
             // For multi-select dragging
             setSlides((curr) => ensureArray(curr).map((slide, i) => {
               if (i !== activeSlide) return slide
               const elements = [...slide.elements]
               updatesArray.forEach(update => {
                 const idx = elements.findIndex(e => e.id === update.id)
                 if (idx !== -1) elements[idx] = { ...elements[idx], x: update.x, y: update.y }
               })
               return { ...slide, elements }
             }))
          }}
          onElementResize={(id, bounds) => updateElement(id, bounds)}
          onElementDelete={handleDeleteElement}
          onElementsDelete={handleDeleteElements}
          onElementTextChange={(id, text) => updateElement(id, { text })}
          onImageDrop={(src, x, y) => {
            const newElement = {
              id: uuidv4(),
              type: 'image',
              x: x || 100,
              y: y || 100,
              width: 300,
              height: 200,
              rotation: 0,
              opacity: 1,
              src
            }
            setSlides((curr) => {
              const currentSlides = [...ensureArray(curr)]
              if (currentSlides[activeSlide]) {
                currentSlides[activeSlide].elements = [...ensureArray(currentSlides[activeSlide].elements), newElement]
              }
              return currentSlides
            })
            setSelectedElemIds([newElement.id])
          }}
          workspaceId={roomId}
        />

        <PropertiesPanel 
          selectedElems={selectedElems}
          selectedElem={selectedElem}
          onFormatElement={(updates) => {
            if (updates.deleteMulti) {
              handleDeleteElements(selectedElemIds)
            } else if (Array.isArray(updates)) {
              setSlides((curr) => ensureArray(curr).map((slide, i) => {
                if (i !== activeSlide) return slide
                const elements = [...slide.elements]
                updates.forEach(update => {
                  const idx = elements.findIndex(e => e.id === update.id)
                  if (idx !== -1) elements[idx] = { ...elements[idx], ...update }
                })
                return { ...slide, elements }
              }))
            } else {
              updateElements(selectedElemIds, updates)
            }
          }}
          onDeleteElement={(id) => handleDeleteElement(id)}
        />
      </div>
    </div>
  )
}
