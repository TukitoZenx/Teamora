import { useRef, useEffect } from 'react'

export default function RichTextEditor({ el, isSelected, isPresenting, onChange }) {
  const contentRef = useRef(null)

  // Sync state to DOM only when not actively editing to preserve cursor position
  useEffect(() => {
    if (contentRef.current && document.activeElement !== contentRef.current) {
      if (contentRef.current.innerHTML !== (el.text || '')) {
        contentRef.current.innerHTML = el.text || ''
      }
    }
  }, [el.text])

  // Focus when selected
  useEffect(() => {
    if (isSelected && contentRef.current && document.activeElement !== contentRef.current) {
      // Small delay to allow the Rnd drag event to finish before focusing
      setTimeout(() => {
        if (contentRef.current) contentRef.current.focus()
      }, 50)
    }
  }, [isSelected])

  const handleInput = (e) => {
    if (onChange) {
      onChange(e.target.innerHTML)
    }
  }

  // Handle native keyboard shortcuts for formatting
  const handleKeyDown = (e) => {
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('bold', false, null)
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('italic', false, null)
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('underline', false, null)
    }
  }

  // Stop double clicks from bubbling up to SlideObject which handles its own
  const handleDoubleClick = (e) => {
    e.stopPropagation()
  }

  return (
    <div
      ref={contentRef}
      contentEditable={isSelected && !isPresenting}
      suppressContentEditableWarning
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
      className={`w-full h-full p-2 outline-none whitespace-pre-wrap break-words overflow-hidden ${isSelected && !isPresenting ? 'pointer-events-auto cursor-text' : 'pointer-events-none'}`}
      style={{
        fontFamily: el.fontFamily || 'Inter, sans-serif',
        fontSize: el.fontSize || '16px',
        fontWeight: el.fontWeight || 'normal',
        fontStyle: el.fontStyle || 'normal',
        textDecoration: el.textDecoration || 'none',
        textAlign: el.textAlign || 'left',
        color: el.color || '#000000',
        lineHeight: el.lineHeight || '1.2',
        letterSpacing: el.letterSpacing || 'normal',
        userSelect: isSelected ? 'text' : 'none'
      }}
    />
  )
}
