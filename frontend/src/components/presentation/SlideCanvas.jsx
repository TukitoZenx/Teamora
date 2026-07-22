import { useRef, useState, useEffect } from 'react'
import SlideObject from './elements/SlideObject'
import RichTextEditor from './elements/RichTextEditor'


export default function SlideCanvas({
  activeSlideData,
  isPresenting,
  presentScale,
  theme,
  activeTool,
  selectedElemIds,
  setSelectedElemIds,
  editingElemId,
  setEditingElemId,
  onElementDrag,
  onElementsDrag,
  onElementResize,
  onElementDelete,
  onElementsDelete,
  onElementTextChange,
  onImageDrop
}) {
  const canvasRef = useRef(null)
  const [selectionBox, setSelectionBox] = useState(null)

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.id === 'slide-canvas-bg') {
      setSelectedElemIds([])
      setEditingElemId(null)
      
      if (!isPresenting) {
        const rect = canvasRef.current.getBoundingClientRect()
        const startX = e.clientX - rect.left
        const startY = e.clientY - rect.top
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY })
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev, currentX: x, currentY: y }))
    }
  }

  const handleCanvasMouseUp = () => {
    if (selectionBox) {
      // Calculate selected items
      const minX = Math.min(selectionBox.startX, selectionBox.currentX)
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX)
      const minY = Math.min(selectionBox.startY, selectionBox.currentY)
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY)

      const newlySelected = (activeSlideData?.elements || []).filter(el => {
        const elMinX = el.x
        const elMaxX = el.x + el.width
        const elMinY = el.y
        const elMaxY = el.y + el.height
        // Check intersection
        return !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY)
      }).map(el => el.id)

      if (newlySelected.length > 0) {
        setSelectedElemIds(newlySelected)
      }
      setSelectionBox(null)
    }
  }

  // Bind mouseup to window to catch releases outside

  useEffect(() => {
    window.addEventListener('mouseup', handleCanvasMouseUp)
    return () => window.removeEventListener('mouseup', handleCanvasMouseUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionBox, activeSlideData])

  const handleCanvasDragOver = (e) => {
    if (!isPresenting) e.preventDefault()
  }

  const handleCanvasDrop = (e) => {
    if (isPresenting) return
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (event) => {
          if (onImageDrop && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            onImageDrop(event.target.result, e.clientX - rect.left, e.clientY - rect.top)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  return (
    <div className="flex-1 bg-card-sunken/40 flex items-center justify-center p-8 overflow-hidden relative" onMouseDown={handleCanvasMouseDown} onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop}>
      <div
        ref={canvasRef}
        id="slide-canvas-bg"
        className={`relative aspect-[16/9] w-full max-w-[850px] overflow-hidden bg-gradient-to-br rounded-lg pointer-events-auto ${theme?.gradient || 'from-white to-slate-50'} ${isPresenting ? '' : 'shadow-2xl ring-1 ring-border/50'}`}
        style={
          isPresenting
            ? { transform: `scale(${presentScale})`, transformOrigin: 'center' }
            : { cursor: activeTool === 'textbox' ? 'crosshair' : 'default' }
        }
        onMouseMove={isPresenting ? undefined : handleCanvasMouseMove}
      >
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${theme?.accent || 'from-primary to-indigo-500'}`} pointer-events-none="true" />



        {/* Marquee Selection Box */}
        {selectionBox && (
          <div
            className="absolute border border-blue-500 bg-blue-500/20 pointer-events-none z-50"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY)
            }}
          />
        )}

        {/* Slide Elements rendering via react-rnd */}
        {(activeSlideData?.elements || []).map((el) => {
          const isSelected = !isPresenting && selectedElemIds.includes(el.id)
          
          return (
            <SlideObject
              key={el.id}
              el={el}
              isSelected={isSelected}
              onSelect={isPresenting ? () => {} : (id, e) => {
                if (e?.shiftKey) {
                  setSelectedElemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
                } else {
                  setSelectedElemIds([id])
                }
              }}
              onDrag={isPresenting ? () => {} : (id, pos, delta) => {
                if (selectedElemIds.length > 1 && selectedElemIds.includes(id) && delta) {
                  // Multi-drag
                  const activeElements = activeSlideData.elements.filter(x => selectedElemIds.includes(x.id))
                  const updates = activeElements.map(x => ({
                    id: x.id,
                    x: x.x + delta.x,
                    y: x.y + delta.y
                  }))
                  onElementsDrag(updates)
                } else {
                  onElementDrag(id, pos)
                }
              }}
              onResize={isPresenting ? () => {} : onElementResize}
              onDelete={isPresenting ? undefined : (id) => {
                if (selectedElemIds.includes(id) && selectedElemIds.length > 1) {
                  onElementsDelete(selectedElemIds)
                } else {
                  onElementDelete(id)
                }
              }}
              externalIsEditing={!isPresenting && editingElemId === el.id}
              onSetEditing={isPresenting ? undefined : (editing) => setEditingElemId(editing ? el.id : null)}
              isForPresenting={isPresenting}
            >
              {el.type === 'image' ? (
                <img src={el.src} className="w-full h-full object-cover pointer-events-none" alt="presentation-img" />
              ) : el.type === 'shape' ? (
                <div className="w-full h-full pointer-events-none" />
              ) : el.type === 'group' ? (
                <div className="w-full h-full relative pointer-events-none">
                  {(el.children || []).map(child => (
                    <div 
                      key={child.id}
                      className="absolute"
                      style={{
                        left: child.x,
                        top: child.y,
                        width: child.width,
                        height: child.height,
                        transform: `rotate(${child.rotation || 0}deg)`,
                        background: child.type === 'textbox' || child.type === 'shape' ? child.fill || 'transparent' : undefined,
                        borderColor: child.borderWidth ? child.borderColor || child.color : 'transparent',
                        opacity: child.opacity ?? 1,
                        boxShadow: child.shadow || 'none',
                        borderRadius: child.borderRadius ? `${child.borderRadius}px` : child.type === 'shape' ? '9999px' : '0px',
                        borderWidth: child.borderWidth ? `${child.borderWidth}px` : '0px',
                        borderStyle: child.borderWidth ? 'solid' : 'none',
                        zIndex: child.zIndex || 1
                      }}
                    >
                      {child.type === 'image' ? (
                        <img src={child.src} className="w-full h-full object-cover" alt="presentation-img" />
                      ) : child.type === 'shape' ? (
                        <div className="w-full h-full" />
                      ) : (
                         <div 
                           className="w-full h-full p-2 whitespace-pre-wrap break-words overflow-hidden"
                           style={{
                             fontFamily: child.fontFamily || 'Inter, sans-serif',
                             fontSize: child.fontSize || '16px',
                             fontWeight: child.fontWeight || 'normal',
                             fontStyle: child.fontStyle || 'normal',
                             textDecoration: child.textDecoration || 'none',
                             textAlign: child.textAlign || 'left',
                             color: child.color || '#000000',
                             lineHeight: child.lineHeight || '1.2',
                             letterSpacing: child.letterSpacing || 'normal',
                           }}
                           dangerouslySetInnerHTML={{ __html: child.text || '' }}
                         />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <RichTextEditor 
                  el={el} 
                  isSelected={isSelected} 
                  isPresenting={isPresenting} 
                  onChange={(html) => onElementTextChange(el.id, html)} 
                />
              )}
            </SlideObject>
          )
        })}

        {/* Presentation Title Placeholder if empty */}
        {(activeSlideData?.elements || []).length === 0 && (
           <div className="absolute inset-0 flex flex-col items-center justify-center text-muted pointer-events-none opacity-50">
              <h1 className="text-4xl font-bold mb-4">{activeSlideData?.title || 'Blank Slide'}</h1>
              <p>Add text, shapes, or images from the toolbar.</p>
           </div>
        )}
      </div>
    </div>
  )
}
