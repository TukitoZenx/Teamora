import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Maximize2, Minimize2 } from 'lucide-react'

const num = (v, fallback = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

const MIN = 40
const MAX_W = 820
const MAX_H = 460

const isEvent = (e) => e && typeof e === 'object' && typeof e.preventDefault === 'function'

/**
 * Native drag + 4-corner resize. Event handlers never run during render.
 */
function SlideObject({
  el,
  isSelected,
  onSelect,
  onDrag,
  onResize,
  onDelete,
  isEditing,
  onSetEditing,
  children,
  isForPresenting
}) {
  const sessionRef = useRef(null)
  const [live, setLive] = useState(null)

  const id = el?.id
  const baseX = num(el?.x, 0)
  const baseY = num(el?.y, 0)
  const baseW = Math.max(MIN, num(el?.width, 100))
  const baseH = Math.max(MIN, num(el?.height, 100))
  const rotation = num(el?.rotation, 0)

  const x = live ? live.x : baseX
  const y = live ? live.y : baseY
  const width = live ? live.width : baseW
  const height = live ? live.height : baseH

  useEffect(() => {
    if (!isEditing) return undefined
    const onKey = (ev) => {
      if (ev.key === 'Escape') onSetEditing?.(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isEditing, onSetEditing])

  const endSession = useCallback(() => {
    const s = sessionRef.current
    sessionRef.current = null
    if (!s || !id) {
      setLive(null)
      return
    }
    const next = {
      x: Math.round(s.x),
      y: Math.round(s.y),
      width: Math.max(MIN, Math.round(s.width)),
      height: Math.max(MIN, Math.round(s.height))
    }
    setLive(null)
    try {
      if (s.mode === 'drag') {
        onDrag?.(id, { x: next.x, y: next.y }, { x: next.x - baseX, y: next.y - baseY })
      } else {
        onResize?.(id, next)
      }
    } catch (err) {
      console.error('geometry commit failed', err)
    }
  }, [id, onDrag, onResize, baseX, baseY])

  useEffect(() => {
    const onMove = (ev) => {
      const s = sessionRef.current
      if (!s) return
      const dx = ev.clientX - s.startClientX
      const dy = ev.clientY - s.startClientY

      if (s.mode === 'drag') {
        s.x = s.originX + dx
        s.y = s.originY + dy
      } else {
        let nx = s.originX
        let ny = s.originY
        let nw = s.originW
        let nh = s.originH
        const corner = s.corner || 'se'

        if (corner.includes('e')) nw = s.originW + dx
        if (corner.includes('w')) {
          nw = s.originW - dx
          nx = s.originX + dx
        }
        if (corner.includes('s')) nh = s.originH + dy
        if (corner.includes('n')) {
          nh = s.originH - dy
          ny = s.originY + dy
        }

        if (nw < MIN) {
          if (corner.includes('w')) nx = s.originX + s.originW - MIN
          nw = MIN
        }
        if (nh < MIN) {
          if (corner.includes('n')) ny = s.originY + s.originH - MIN
          nh = MIN
        }
        nw = Math.min(MAX_W, nw)
        nh = Math.min(MAX_H, nh)

        s.x = nx
        s.y = ny
        s.width = nw
        s.height = nh
      }
      setLive({ x: s.x, y: s.y, width: s.width, height: s.height })
    }
    const onUp = () => {
      if (sessionRef.current) endSession()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [endSession])

  const startDrag = useCallback(
    (e) => {
      if (!isEvent(e)) return
      if (isForPresenting || isEditing || el?.locked) return
      if (e.button != null && e.button !== 0) return
      if (e.target?.isContentEditable) return
      if (e.target?.closest?.('[data-handle]')) return
      e.stopPropagation()
      if (!isSelected || e.shiftKey) onSelect?.(id, e)
      sessionRef.current = {
        mode: 'drag',
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: baseX,
        originY: baseY,
        originW: baseW,
        originH: baseH,
        x: baseX,
        y: baseY,
        width: baseW,
        height: baseH
      }
    },
    [isForPresenting, isEditing, el?.locked, isSelected, onSelect, id, baseX, baseY, baseW, baseH]
  )

  const beginResize = useCallback(
    (corner, e) => {
      if (!isEvent(e)) return
      if (isForPresenting || isEditing || el?.locked) return
      e.preventDefault()
      e.stopPropagation()
      if (!isSelected) onSelect?.(id, e)
      sessionRef.current = {
        mode: 'resize',
        corner: corner || 'se',
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: baseX,
        originY: baseY,
        originW: baseW,
        originH: baseH,
        x: baseX,
        y: baseY,
        width: baseW,
        height: baseH
      }
    },
    [isForPresenting, isEditing, el?.locked, isSelected, onSelect, id, baseX, baseY, baseW, baseH]
  )

  const applyScale = useCallback(
    (factor, e) => {
      if (isEvent(e)) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (!id) return
      const cx = baseX + baseW / 2
      const cy = baseY + baseH / 2
      const nw = Math.max(MIN, Math.min(MAX_W, Math.round(baseW * factor)))
      const nh = Math.max(MIN, Math.min(MAX_H, Math.round(baseH * factor)))
      onResize?.(id, {
        x: Math.round(cx - nw / 2),
        y: Math.round(cy - nh / 2),
        width: nw,
        height: nh
      })
    },
    [id, baseX, baseY, baseW, baseH, onResize]
  )

  if (!el || !id) return null

  const visual = {
    background:
      el.type === 'textbox' || el.type === 'text' || el.type === 'shape' || el.type === 'icon'
        ? el.fill || 'transparent'
        : undefined,
    borderColor: el.borderWidth ? el.borderColor || el.color || 'transparent' : 'transparent',
    opacity: el.opacity ?? 1,
    boxShadow: el.shadow || 'none',
    borderRadius: el.borderRadius != null && el.borderRadius !== '' ? `${el.borderRadius}px` : '0px',
    borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
    borderStyle: el.borderWidth ? 'solid' : 'none',
    boxSizing: 'border-box'
  }

  const handleClass = 'absolute z-[70] h-3 w-3 rounded-sm border-2 border-primary bg-white shadow pointer-events-auto'

  const showHandles = isSelected && !isEditing && !isForPresenting
  const isBox = el.type === 'textbox' || el.type === 'text' || el.type === 'shape'

  return (
    <div
      data-slide-object={id}
      onPointerDown={startDrag}
      onDoubleClick={(e) => {
        if (!isEvent(e)) return
        if (isForPresenting || el.type === 'image') return
        e.stopPropagation()
        onSetEditing?.(true)
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width,
        height,
        zIndex: (el.zIndex || 10) + (isSelected ? 1000 : 0),
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        cursor: isEditing ? 'text' : 'move',
        touchAction: 'none',
        userSelect: isEditing ? 'text' : 'none',
        ...visual
      }}
    >
      <div className="h-full w-full overflow-hidden">{children}</div>

      {isSelected && !isForPresenting && (
        <div className="pointer-events-none absolute inset-0 z-40 border-2 border-primary" />
      )}

      {showHandles && (
        <>
          <button
            type="button"
            data-handle="delete"
            onPointerDown={(e) => {
              if (isEvent(e)) e.stopPropagation()
            }}
            onClick={(e) => {
              if (isEvent(e)) e.stopPropagation()
              onDelete?.(id)
            }}
            className="absolute -right-3.5 -top-3.5 z-[80] rounded-full border border-slate-200 bg-white p-0.5 text-slate-500 shadow-md hover:bg-red-500 hover:text-white"
            title="Delete"
          >
            <X className="h-3 w-3" />
          </button>

          {isBox && (
            <div className="absolute -top-8 left-1/2 z-[80] flex -translate-x-1/2 items-center gap-1">
              <button
                type="button"
                data-handle="max"
                onPointerDown={(e) => {
                  if (isEvent(e)) e.stopPropagation()
                }}
                onClick={(e) => applyScale(1.25, e)}
                className="flex h-5 w-5 items-center justify-center rounded border border-border bg-white text-primary shadow"
                title="Maximize (larger)"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <button
                type="button"
                data-handle="min"
                onPointerDown={(e) => {
                  if (isEvent(e)) e.stopPropagation()
                }}
                onClick={(e) => applyScale(0.8, e)}
                className="flex h-5 w-5 items-center justify-center rounded border border-border bg-white text-primary shadow"
                title="Minimize (smaller)"
              >
                <Minimize2 className="h-3 w-3" />
              </button>
            </div>
          )}

          <div
            data-handle="nw"
            onPointerDown={(e) => beginResize('nw', e)}
            className={`${handleClass} -left-1.5 -top-1.5 cursor-nwse-resize`}
            title="Resize"
          />
          <div
            data-handle="ne"
            onPointerDown={(e) => beginResize('ne', e)}
            className={`${handleClass} -right-1.5 -top-1.5 cursor-nesw-resize`}
            title="Resize"
          />
          <div
            data-handle="sw"
            onPointerDown={(e) => beginResize('sw', e)}
            className={`${handleClass} -bottom-1.5 -left-1.5 cursor-nesw-resize`}
            title="Resize"
          />
          <div
            data-handle="se"
            onPointerDown={(e) => beginResize('se', e)}
            className={`${handleClass} -bottom-1.5 -right-1.5 cursor-nwse-resize`}
            title="Resize"
          />
        </>
      )}
    </div>
  )
}

export default React.memo(SlideObject)
