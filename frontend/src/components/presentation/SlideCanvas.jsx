import { useRef, useState, useEffect, useMemo } from 'react'
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
  onElementRotate,
  onElementDelete,
  onElementsDelete,
  onElementTextChange,
  onImageDrop
}) {
  const canvasRef = useRef(null)
  const [selectionBox, setSelectionBox] = useState(null)

  const sortedElements = useMemo(() => {
    const list = Array.isArray(activeSlideData?.elements) ? [...activeSlideData.elements] : []
    list.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    return list
  }, [activeSlideData])

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.id === 'slide-canvas-bg') {
      setSelectedElemIds?.([])
      setEditingElemId?.(null)

      if (!isPresenting) {
        const rect = canvasRef.current.getBoundingClientRect()
        const startX = e.clientX - rect.left
        const startY = e.clientY - rect.top
        setSelectionBox({ startX, startY, currentX: startX, currentY: startY })
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (!canvasRef.current || !selectionBox) return
    const rect = canvasRef.current.getBoundingClientRect()
    setSelectionBox((prev) => ({
      ...prev,
      currentX: e.clientX - rect.left,
      currentY: e.clientY - rect.top
    }))
  }

  const handleCanvasMouseUp = () => {
    if (!selectionBox) return
    const minX = Math.min(selectionBox.startX, selectionBox.currentX)
    const maxX = Math.max(selectionBox.startX, selectionBox.currentX)
    const minY = Math.min(selectionBox.startY, selectionBox.currentY)
    const maxY = Math.max(selectionBox.startY, selectionBox.currentY)
    const w = maxX - minX
    const h = maxY - minY

    // Tiny marquee = click deselect only
    if (w > 4 || h > 4) {
      const newlySelected = sortedElements
        .filter((el) => {
          const elMinX = el.x
          const elMaxX = el.x + el.width
          const elMinY = el.y
          const elMaxY = el.y + el.height
          return !(elMaxX < minX || elMinX > maxX || elMaxY < minY || elMinY > maxY)
        })
        .map((el) => el.id)
      if (newlySelected.length > 0) setSelectedElemIds?.(newlySelected)
    }
    setSelectionBox(null)
  }

  useEffect(() => {
    window.addEventListener('mouseup', handleCanvasMouseUp)
    return () => window.removeEventListener('mouseup', handleCanvasMouseUp)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionBox, sortedElements])

  const handleCanvasDragOver = (e) => {
    if (!isPresenting) e.preventDefault()
  }

  const handleCanvasDrop = async (e) => {
    if (isPresenting) return
    e.preventDefault()
    if (e.dataTransfer.files?.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        try {
          const { compressImageToDataUrl } = await import('./utils/compressImage')
          const { dataUrl, width, height } = await compressImageToDataUrl(file)
          if (onImageDrop && canvasRef.current) {
            const rect = canvasRef.current.getBoundingClientRect()
            const displayW = Math.min(360, width)
            const displayH = Math.round(displayW * (height / Math.max(1, width)))
            onImageDrop(
              dataUrl,
              e.clientX - rect.left,
              e.clientY - rect.top,
              displayW,
              Math.max(80, displayH)
            )
          }
        } catch (err) {
          console.error('drop image failed', err)
        }
      }
    }
  }

  const renderElementBody = (el, isSelected) => {
    if (el.type === 'image') {
      return (
        <img
          src={el.src}
          className="pointer-events-none h-full w-full object-cover"
          alt=""
          draggable={false}
        />
      )
    }

    if (el.type === 'icon') {
      return (
        <div
          className="flex h-full w-full select-none items-center justify-center pointer-events-none"
          style={{
            fontSize: el.fontSize || Math.min(el.width || 64, el.height || 64) * 0.55
          }}
        >
          {el.icon || el.text || '★'}
        </div>
      )
    }

    if (el.type === 'shape') {
      return (
        <RichTextEditor
          el={el}
          isSelected={isSelected}
          isPresenting={isPresenting}
          isEditing={!isPresenting && editingElemId === el.id}
          centered
          onChange={(html) => onElementTextChange?.(el.id, html)}
        />
      )
    }

    if (el.type === 'group') {
      return (
        <div className="pointer-events-none relative h-full w-full">
          {(el.children || []).map((child) => (
            <div
              key={child.id}
              className="absolute"
              style={{
                left: child.x,
                top: child.y,
                width: child.width,
                height: child.height,
                transform: `rotate(${child.rotation || 0}deg)`,
                background:
                  child.type === 'textbox' || child.type === 'shape' || child.type === 'icon'
                    ? child.fill || 'transparent'
                    : undefined,
                borderColor: child.borderWidth
                  ? child.borderColor || child.color
                  : 'transparent',
                opacity: child.opacity ?? 1,
                borderRadius:
                  child.borderRadius != null && child.borderRadius !== ''
                    ? `${child.borderRadius}px`
                    : '0px',
                borderWidth: child.borderWidth ? `${child.borderWidth}px` : '0px',
                borderStyle: child.borderWidth ? 'solid' : 'none',
                overflow: 'hidden'
              }}
            >
              {child.type === 'image' ? (
                <img src={child.src} className="h-full w-full object-cover" alt="" />
              ) : child.type === 'icon' ? (
                <div className="flex h-full w-full items-center justify-center text-2xl">
                  {child.icon || '★'}
                </div>
              ) : child.type === 'shape' || child.type === 'textbox' || child.type === 'text' ? (
                <div
                  className="h-full w-full overflow-hidden whitespace-pre-wrap break-words p-2"
                  style={{
                    fontFamily: child.fontFamily || 'Inter, sans-serif',
                    fontSize: child.fontSize || '16px',
                    fontWeight: child.fontWeight || 'normal',
                    fontStyle: child.fontStyle || 'normal',
                    textDecoration: child.textDecoration || 'none',
                    textAlign: child.textAlign || (child.type === 'shape' ? 'center' : 'left'),
                    color: child.color || '#000000'
                  }}
                  dangerouslySetInnerHTML={{ __html: child.text || '' }}
                />
              ) : null}
            </div>
          ))}
        </div>
      )
    }

    // textbox / text / default
    return (
      <RichTextEditor
        el={el}
        isSelected={isSelected}
        isPresenting={isPresenting}
        isEditing={!isPresenting && editingElemId === el.id}
        onChange={(html) => onElementTextChange?.(el.id, html)}
      />
    )
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-card-sunken/40 p-3 sm:p-6 md:p-8"
      onMouseDown={handleCanvasMouseDown}
      onDragOver={handleCanvasDragOver}
      onDrop={handleCanvasDrop}
    >
      <div
        ref={canvasRef}
        id="slide-canvas-bg"
        className={`relative aspect-[16/9] w-full max-w-[850px] overflow-hidden rounded-lg bg-gradient-to-br pointer-events-auto ${
          theme?.gradient || 'from-white to-slate-50'
        } ${isPresenting ? '' : 'shadow-2xl ring-1 ring-border/50'}`}
        style={
          isPresenting
            ? { transform: `scale(${presentScale})`, transformOrigin: 'center' }
            : { cursor: activeTool === 'textbox' ? 'crosshair' : 'default' }
        }
        onMouseMove={isPresenting ? undefined : handleCanvasMouseMove}
      >
        <div
          className={`pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
            theme?.accent || 'from-primary to-indigo-500'
          }`}
        />

        {selectionBox && (
          <div
            className="pointer-events-none absolute z-50 border border-blue-500 bg-blue-500/20"
            style={{
              left: Math.min(selectionBox.startX, selectionBox.currentX),
              top: Math.min(selectionBox.startY, selectionBox.currentY),
              width: Math.abs(selectionBox.currentX - selectionBox.startX),
              height: Math.abs(selectionBox.currentY - selectionBox.startY)
            }}
          />
        )}

        {sortedElements.map((el) => {
          const selectedIds = Array.isArray(selectedElemIds) ? selectedElemIds : []
          const isSelected = !isPresenting && selectedIds.includes(el.id)

          return (
            <SlideObject
              key={el.id}
              el={el}
              isSelected={isSelected}
              isEditing={!isPresenting && editingElemId === el.id}
              onSelect={
                isPresenting
                  ? () => {}
                  : (id, e) => {
                      if (e?.shiftKey) {
                        setSelectedElemIds?.((prev) => {
                          const list = Array.isArray(prev) ? prev : []
                          return list.includes(id)
                            ? list.filter((x) => x !== id)
                            : [...list, id]
                        })
                      } else {
                        setSelectedElemIds?.([id])
                      }
                    }
              }
              onDrag={
                isPresenting
                  ? () => {}
                  : (id, pos, delta) => {
                      try {
                        if (selectedIds.length > 1 && selectedIds.includes(id) && delta) {
                          const activeElements = sortedElements.filter((x) =>
                            selectedIds.includes(x.id)
                          )
                          const updates = activeElements.map((x) => ({
                            id: x.id,
                            x: (Number(x.x) || 0) + (Number(delta.x) || 0),
                            y: (Number(x.y) || 0) + (Number(delta.y) || 0)
                          }))
                          onElementsDrag?.(updates)
                        } else {
                          onElementDrag?.(id, pos)
                        }
                      } catch (err) {
                        console.error('drag handler error', err)
                      }
                    }
              }
              onResize={isPresenting ? () => {} : onElementResize}
              onRotate={isPresenting ? () => {} : onElementRotate}
              onDelete={
                isPresenting
                  ? undefined
                  : (id) => {
                      if (selectedIds.includes(id) && selectedIds.length > 1) {
                        onElementsDelete?.(selectedIds)
                      } else {
                        onElementDelete?.(id)
                      }
                    }
              }
              onSetEditing={
                isPresenting
                  ? undefined
                  : (editing) => setEditingElemId?.(editing ? el.id : null)
              }
              isForPresenting={isPresenting}
            >
              {renderElementBody(el, isSelected)}
            </SlideObject>
          )
        })}

        {sortedElements.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-muted opacity-50">
            <h1 className="mb-4 text-2xl font-bold sm:text-4xl">
              {activeSlideData?.title || 'Blank Slide'}
            </h1>
            <p className="text-sm">Add text, shapes, images, or icons from the toolbar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
