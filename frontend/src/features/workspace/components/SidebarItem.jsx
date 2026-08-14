import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export default function SidebarItem({
  icon: Icon,
  label,
  active = false,
  danger = false,
  collapsed = false,
  tooltipPlacement = 'right',
  onClick
}) {
  const btnRef = useRef(null)
  const tooltipId = useId()
  const [tip, setTip] = useState(null)

  const hideTip = () => setTip(null)

  const showTip = () => {
    if (!collapsed || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const preferUp = tooltipPlacement === 'right-start' || rect.bottom > window.innerHeight - 72
    setTip({
      top: preferUp ? rect.top + rect.height / 2 : rect.top + rect.height / 2,
      left: rect.right + 10,
      preferUp
    })
  }

  useEffect(() => {
    if (!tip) return undefined
    const hide = () => setTip(null)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('resize', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('resize', hide)
    }
  }, [tip])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        onMouseEnter={showTip}
        onMouseLeave={hideTip}
        onFocus={showTip}
        onBlur={hideTip}
        aria-label={label}
        aria-describedby={collapsed && tip ? tooltipId : undefined}
        aria-current={active ? 'page' : undefined}
        className={`group relative flex w-full items-center rounded-xl py-2.5 text-left text-sm font-medium transition duration-normal focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 ${
          collapsed ? 'h-10 justify-center px-0' : 'min-h-10 gap-3 px-3'
        } ${
          active
            ? 'bg-primary/10 text-primary'
            : danger
              ? 'text-danger hover:bg-danger/10'
              : 'text-muted hover:bg-primary/10 hover:text-primary'
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary" aria-hidden />
        )}
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-primary' : ''}`} aria-hidden />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
      {collapsed &&
        tip &&
        createPortal(
          <span
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-tooltip whitespace-nowrap rounded-md border border-border bg-card-elevated px-2 py-1 text-[11px] font-medium text-text shadow-dropdown"
            style={{
              top: tip.top,
              left: tip.left,
              transform: 'translateY(-50%)'
            }}
          >
            {label}
          </span>,
          document.body
        )}
    </>
  )
}
