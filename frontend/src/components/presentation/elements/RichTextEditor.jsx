import { useRef, useEffect, useCallback } from 'react'

/**
 * Content-editable text for text boxes and shapes.
 * Editable only when isEditing (double-click) so drag/resize works on select.
 */
export default function RichTextEditor({ el, isSelected, isPresenting, isEditing, onChange, centered = false }) {
  const contentRef = useRef(null)
  const lastEmittedRef = useRef(el?.text || '')
  // Only true after double-click — NOT on mere selection (selection must allow drag)
  const editable = Boolean(isEditing && !isPresenting)

  const emitIfChanged = useCallback(() => {
    const node = contentRef.current
    if (!node || !onChange) return
    const html = node.innerHTML
    if (html !== lastEmittedRef.current) {
      lastEmittedRef.current = html
      onChange(html)
    }
  }, [onChange])

  useEffect(() => {
    const node = contentRef.current
    if (!node) return
    const next = el?.text || ''
    lastEmittedRef.current = next
    if (document.activeElement === node) return
    if (node.innerHTML !== next) {
      node.innerHTML = next
    }
  }, [el?.text, el?.id])

  useEffect(() => {
    if (!isEditing || isPresenting) return undefined
    const t = window.setTimeout(() => {
      try {
        contentRef.current?.focus()
      } catch {
        // ignore
      }
    }, 40)
    return () => window.clearTimeout(t)
  }, [isEditing, isPresenting])

  useEffect(() => {
    const node = contentRef.current
    return () => {
      if (!node || !onChange) return
      try {
        const html = node.innerHTML
        if (html !== lastEmittedRef.current) onChange(html)
      } catch {
        // ignore unmount races
      }
    }
  }, [onChange])

  // Normalize size so "24" and "24px" both work
  const rawSize = el?.fontSize
  const fontSize =
    rawSize == null || rawSize === ''
      ? '16px'
      : typeof rawSize === 'number'
        ? `${rawSize}px`
        : /px$|em$|rem$|%$/.test(String(rawSize))
          ? String(rawSize)
          : `${rawSize}px`

  const style = {
    fontFamily: el?.fontFamily || 'Inter, sans-serif',
    fontSize,
    fontWeight: el?.fontWeight || 'normal',
    fontStyle: el?.fontStyle || 'normal',
    textDecoration: el?.textDecoration || 'none',
    textAlign: el?.textAlign || (centered ? 'center' : 'left'),
    color: el?.color || '#000000',
    lineHeight: el?.lineHeight || '1.2',
    letterSpacing: el?.letterSpacing || 'normal',
    userSelect: editable ? 'text' : 'none'
  }

  if (isPresenting) {
    return (
      <div
        className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words p-2 ${
          centered ? 'flex items-center justify-center' : ''
        }`}
        style={style}
        dangerouslySetInnerHTML={{ __html: el?.text || '' }}
      />
    )
  }

  const handleKeyDown = (e) => {
    e.stopPropagation()
    if (e.key === 'b' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('bold', false, null)
      queueMicrotask(emitIfChanged)
    } else if (e.key === 'i' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('italic', false, null)
      queueMicrotask(emitIfChanged)
    } else if (e.key === 'u' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      document.execCommand('underline', false, null)
      queueMicrotask(emitIfChanged)
    }
  }

  return (
    <div
      ref={contentRef}
      contentEditable={editable}
      suppressContentEditableWarning
      data-slide-text-editor="true"
      data-element-id={el?.id}
      onInput={emitIfChanged}
      onBlur={emitIfChanged}
      onKeyDown={handleKeyDown}
      onDoubleClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        // While editing text, don't start a drag
        if (editable) e.stopPropagation()
      }}
      className={`h-full w-full overflow-hidden whitespace-pre-wrap break-words p-2 outline-none ${
        editable ? 'pointer-events-auto cursor-text' : 'pointer-events-none'
      } ${centered ? 'flex items-center justify-center' : ''}`}
      style={style}
      // Show selection ring is handled by parent; keep text visible when selected
      aria-selected={isSelected}
    />
  )
}
