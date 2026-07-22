import React, { useState, useEffect } from 'react'
import { Rnd } from 'react-rnd'
import { X } from 'lucide-react'

const SlideObject = React.memo(({ 
  el, isSelected, onSelect, onDrag, onResize, onDelete, 
  externalIsEditing, onSetEditing, children, isForPresenting 
}) => {
  const [isEditing, setIsEditing] = useState(false)

  const [prevExternal, setPrevExternal] = useState(externalIsEditing)
  if (externalIsEditing !== prevExternal) {
    setPrevExternal(externalIsEditing)
    if (externalIsEditing !== undefined) setIsEditing(externalIsEditing)
  }

  const [prevIsSelected, setPrevIsSelected] = useState(isSelected)
  if (isSelected !== prevIsSelected) {
    setPrevIsSelected(isSelected)
    if (!isSelected) {
      setIsEditing(false)
      if (onSetEditing) onSetEditing(false)
    }
  }

  const handleDoubleClick = (e) => {
    if (isForPresenting) return
    e.stopPropagation()
    setIsEditing(true)
    if (onSetEditing) onSetEditing(true)
  }

  // Handle keyboard events when editing
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

  if (isForPresenting) {
    return (
      <div
        style={{
          position: 'absolute',
          left: el.x,
          top: el.y,
          width: el.width,
          height: el.height,
          zIndex: el.zIndex || 10,
          transform: `rotate(${el.rotation || 0}deg)`,
          background: el.type === 'textbox' || el.type === 'shape' ? el.fill || 'transparent' : undefined,
          borderColor: el.borderWidth ? el.borderColor || el.color : 'transparent',
          opacity: el.opacity ?? 1,
          boxShadow: el.shadow || 'none',
          borderRadius: el.borderRadius ? `${el.borderRadius}px` : el.type === 'shape' ? '9999px' : '0px',
          borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
          borderStyle: el.borderWidth ? 'solid' : 'none',
        }}
      >
        {children}
      </div>
    )
  }

  return (
    <Rnd
      size={{ width: el.width, height: el.height }}
      position={{ x: el.x, y: el.y }}
      onDragStart={(e) => {
        if (!isSelected || e.shiftKey) onSelect(el.id, e)
      }}
      onDragStop={(e, d) => {
        if (!isEditing) {
          onDrag(el.id, { x: d.x, y: d.y }, { x: d.x - el.x, y: d.y - el.y })
        }
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onResize(el.id, {
          width: ref.offsetWidth,
          height: ref.offsetHeight,
          x: position.x,
          y: position.y
        })
      }}
      disableDragging={isEditing || el.locked}
      enableResizing={!isEditing && !el.locked && isSelected}
      bounds="parent"
      className={`absolute transition-shadow ${isSelected ? 'z-40' : 'z-10'}`}
      style={{
        transform: `translate(${el.x}px, ${el.y}px) rotate(${el.rotation || 0}deg) !important`,
        background: el.type === 'textbox' || el.type === 'shape' ? el.fill || 'transparent' : undefined,
        borderColor: el.borderWidth ? el.borderColor || el.color : 'transparent',
        opacity: el.opacity ?? 1,
        boxShadow: el.shadow || 'none',
        borderRadius: el.borderRadius ? `${el.borderRadius}px` : el.type === 'shape' ? '9999px' : '0px',
        borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
        borderStyle: el.borderWidth ? 'solid' : 'none',
      }}
      onMouseDown={(e) => {
        if (!isSelected || e.shiftKey) onSelect(el.id, e)
      }}
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full h-full relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { isEditing })
          }
          return child
        })}
        
        {isSelected && (
          <div className="absolute inset-0 pointer-events-none border-2 border-primary z-40 animate-none" />
        )}

        {isSelected && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onDelete) onDelete(el.id)
            }}
            className="absolute -top-3.5 -right-3.5 bg-white hover:bg-red-500 hover:text-white text-slate-500 border border-slate-200 rounded-full p-0.5 shadow-md z-[70] transition-colors"
            title="Delete"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </Rnd>
  )
})

export default SlideObject
