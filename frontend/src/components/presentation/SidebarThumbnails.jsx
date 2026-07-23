import { useEffect, useRef, useState, memo, useMemo } from 'react'
import { Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import { sanitizeHtml } from '../../utils/sanitizeHtml'

/** Design size of the main slide canvas (matches PresentSlideView / SlideCanvas). */
const SLIDE_W = 850
const SLIDE_H = (850 * 9) / 16

const stripHtml = (html) =>
  String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Mini slide preview: same layout as the editor canvas, scaled to the thumbnail.
 * So the sidebar matches what the user sees on the big slide.
 */
function SlideMiniPreview({ slide, theme }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(0.15)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined

    const update = () => {
      const w = node.clientWidth || 1
      setScale(w / SLIDE_W)
    }
    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => window.removeEventListener('resize', update)
    }

    const ro = new ResizeObserver(update)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const elements = useMemo(() => {
    const list = Array.isArray(slide?.elements) ? [...slide.elements] : []
    list.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
    return list
  }, [slide?.elements])

  const gradient = theme?.gradient || 'from-white to-slate-50'
  const accent = theme?.accent || 'from-primary to-indigo-500'
  const isEmpty = elements.length === 0

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      <div
        className={`absolute left-0 top-0 bg-gradient-to-br ${gradient}`}
        style={{
          width: SLIDE_W,
          height: SLIDE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left'
        }}
      >
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />

        {elements.map((el) => (
          <div
            key={el.id || `${el.x}-${el.y}-${el.type}`}
            style={{
              position: 'absolute',
              left: el.x ?? 0,
              top: el.y ?? 0,
              width: el.width ?? 0,
              height: el.height ?? 0,
              zIndex: el.zIndex ?? 1,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              opacity: el.opacity ?? 1,
              borderRadius:
                el.borderRadius != null && el.borderRadius !== ''
                  ? `${el.borderRadius}px`
                  : el.shape === 'circle'
                    ? '50%'
                    : '0px',
              borderWidth: el.borderWidth ? `${el.borderWidth}px` : '0px',
              borderStyle: el.borderWidth ? 'solid' : 'none',
              borderColor: el.borderWidth ? el.borderColor || el.color || 'transparent' : 'transparent',
              background:
                el.type === 'image'
                  ? undefined
                  : el.fill || (el.type === 'shape' ? '#e2e8f0' : 'transparent'),
              overflow: 'hidden',
              boxSizing: 'border-box',
              pointerEvents: 'none'
            }}
          >
            {el.type === 'image' && el.src ? (
              <img src={el.src} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : el.type === 'icon' ? (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ fontSize: Math.min(el.width || 40, el.height || 40) * 0.55 }}
              >
                {el.icon || el.text || '★'}
              </div>
            ) : el.type === 'shape' ? (
              stripHtml(el.text) ? (
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden p-1 text-center"
                  style={{
                    color: el.color || '#000',
                    fontSize: el.fontSize || '16px',
                    fontWeight: el.fontWeight || 'normal',
                    fontFamily: el.fontFamily || 'Inter, sans-serif',
                    lineHeight: 1.2
                  }}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(el.text) }}
                />
              ) : null
            ) : el.type === 'group' ? (
              (el.children || []).map((child) => (
                <div
                  key={child.id || `${child.x}-${child.y}`}
                  style={{
                    position: 'absolute',
                    left: child.x ?? 0,
                    top: child.y ?? 0,
                    width: child.width ?? 0,
                    height: child.height ?? 0,
                    background: child.fill || 'transparent',
                    overflow: 'hidden'
                  }}
                />
              ))
            ) : (
              <div
                className="h-full w-full overflow-hidden p-1"
                style={{
                  color: el.color || '#000',
                  fontSize: el.fontSize || '16px',
                  fontWeight: el.fontWeight || 'normal',
                  fontFamily: el.fontFamily || 'Inter, sans-serif',
                  textAlign: el.textAlign || 'left',
                  lineHeight: 1.2
                }}
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(el.text || '') }}
              />
            )}
          </div>
        ))}

        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center text-2xl font-semibold text-slate-400">
            {slide?.title || 'Blank slide'}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * PowerPoint-like slide rail with real mini previews of each slide.
 */
function SidebarThumbnails({
  slides = [],
  activeSlide,
  setActiveSlide,
  onAddSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onToggleVisibility,
  onDragStart,
  onDragOver,
  onDrop,
  theme
}) {
  const listRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    const node = activeRef.current
    const list = listRef.current
    if (!node || !list) return

    try {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    } catch {
      const listRect = list.getBoundingClientRect()
      const nodeRect = node.getBoundingClientRect()
      if (nodeRect.top < listRect.top) {
        list.scrollTop -= listRect.top - nodeRect.top + 8
      } else if (nodeRect.bottom > listRect.bottom) {
        list.scrollTop += nodeRect.bottom - listRect.bottom + 8
      }
    }
  }, [activeSlide, slides.length])

  return (
    <aside
      className="flex h-full min-h-0 w-[7.5rem] shrink-0 flex-col border-r border-border bg-card xs:w-36 sm:w-44 md:w-48 xl:w-56"
      aria-label="Slide navigator"
    >
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-border p-2 shadow-sm sm:p-2.5 md:p-3">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-text sm:text-xs">
          Slides
          {slides.length > 0 && (
            <span className="ml-1 font-medium normal-case tracking-normal text-muted">({slides.length})</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => onAddSlide?.()}
          className="cursor-pointer rounded p-1 text-primary shadow-sm transition-colors hover:bg-primary hover:text-white"
          title="New Slide"
          aria-label="Add slide"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div
        ref={listRef}
        className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden overscroll-y-contain scroll-smooth p-1.5 sm:space-y-2.5 sm:p-2 md:space-y-3 md:p-3"
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
        role="listbox"
        aria-label="Slides list"
        aria-activedescendant={slides[activeSlide]?.id ? `slide-thumb-${slides[activeSlide].id}` : undefined}
      >
        {slides.length === 0 && (
          <div className="rounded border border-dashed border-border p-4 text-center text-xs text-muted">
            No slides yet.
          </div>
        )}

        {slides.map((s, i) => {
          const isActive = activeSlide === i
          const isHidden = Boolean(s?.hidden)
          const slideKey = s?.id || `slide-${i}`

          return (
            <div
              key={slideKey}
              id={`slide-thumb-${slideKey}`}
              ref={isActive ? activeRef : null}
              draggable
              onDragStart={(e) => onDragStart?.(e, i)}
              onDragOver={(e) => {
                e.preventDefault()
                onDragOver?.(e, i)
              }}
              onDrop={(e) => onDrop?.(e, i)}
              className="group relative cursor-grab active:cursor-grabbing"
              role="option"
              aria-selected={isActive}
            >
              <div className="mb-0.5 flex items-center justify-between sm:mb-1">
                <span className={`text-[10px] font-bold tabular-nums ${isActive ? 'text-primary' : 'text-muted'}`}>
                  {i + 1}
                </span>
                <div className="flex items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleVisibility?.(i)
                    }}
                    className="rounded p-0.5 text-muted transition-colors hover:bg-muted/40 hover:text-primary"
                    title={isHidden ? 'Show slide' : 'Hide slide'}
                    aria-label={isHidden ? 'Show slide' : 'Hide slide'}
                  >
                    {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicateSlide?.(i)
                    }}
                    className="rounded p-0.5 text-muted transition-colors hover:bg-muted/40 hover:text-primary"
                    title="Duplicate slide"
                    aria-label="Duplicate slide"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteSlide?.(i)
                    }}
                    className="rounded p-0.5 text-muted transition-colors hover:bg-muted/40 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    title="Delete slide"
                    aria-label="Delete slide"
                    disabled={slides.length <= 1}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSlide?.(i)}
                className={`relative aspect-[16/9] w-full overflow-hidden rounded-md border-2 text-left transition-all duration-200 ${
                  isActive
                    ? 'border-primary shadow-md ring-2 ring-primary/20'
                    : 'border-border/60 hover:border-border hover:shadow-sm'
                } ${isHidden ? 'opacity-40 grayscale' : 'opacity-100'}`}
                title={s?.title || `Slide ${i + 1}`}
              >
                <SlideMiniPreview slide={s} theme={theme} />
                {isHidden && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15">
                    <EyeOff className="h-3.5 w-3.5 text-slate-700" />
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default memo(SidebarThumbnails)
