import { useEffect, useRef, memo } from 'react'
import { Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'

/**
 * PowerPoint-like slide rail:
 * - Smooth scrolling when slides overflow (2–3+)
 * - Scrollbar hidden while scroll remains active
 * - Responsive widths for mobile / tablet / desktop
 * - Auto-scroll active thumbnail into view
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

  // Keep the active slide thumbnail in view when navigating.
  useEffect(() => {
    const node = activeRef.current
    const list = listRef.current
    if (!node || !list) return

    // Prefer native scrollIntoView with nearest block to avoid jarring jumps.
    try {
      node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    } catch {
      // Fallback for older environments
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
          const elementCount = Array.isArray(s?.elements) ? s.elements.length : 0

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
              style={{ contentVisibility: 'auto', containIntrinsicSize: '0 90px' }}
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
              >
                <div
                  className={`pointer-events-none relative flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-1 ${
                    theme?.gradient || 'from-white to-slate-50'
                  }`}
                >
                  <div
                    className={`absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r ${
                      theme?.accent || 'from-primary to-indigo-500'
                    }`}
                  />
                  <div className="w-full truncate px-1 text-center text-[6px] font-bold text-slate-800 dark:text-slate-200 sm:text-[7px]">
                    {s?.title || 'Untitled'}
                  </div>
                  {elementCount > 0 && (
                    <div className="mt-0.5 text-[5px] font-medium text-slate-500 sm:text-[6px]">
                      {elementCount} object{elementCount === 1 ? '' : 's'}
                    </div>
                  )}
                  {isHidden && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <EyeOff className="h-3 w-3 text-slate-600" />
                    </div>
                  )}
                </div>
              </button>
            </div>
          )
        })}
      </div>
    </aside>
  )
}

export default memo(SidebarThumbnails)
