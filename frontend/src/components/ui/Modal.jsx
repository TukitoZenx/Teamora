import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ')

const getFocusable = (root) => {
  if (!root) return []
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false
    const style = window.getComputedStyle(el)
    return style.visibility !== 'hidden' && style.display !== 'none' && el.offsetParent !== null
  })
}

export default function Modal({
  children,
  onClose,
  className,
  size = 'md',
  titleId,
  descriptionId,
  initialFocusRef,
  labelledBy,
  describedBy
}) {
  const panelRef = useRef(null)
  const previouslyFocused = useRef(null)
  const reduceMotion = useReducedMotion()
  const autoTitleId = useId()
  const resolvedTitleId = titleId || labelledBy || autoTitleId

  useEffect(() => {
    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
        return
      }

      if (event.key !== 'Tab') return

      const focusableElements = getFocusable(panelRef.current)
      if (focusableElements.length === 0) {
        event.preventDefault()
        panelRef.current?.focus()
        return
      }

      const first = focusableElements[0]
      const last = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        if (document.activeElement === first || document.activeElement === panelRef.current) {
          last.focus()
          event.preventDefault()
        }
      } else if (document.activeElement === last) {
        first.focus()
        event.preventDefault()
      }
    }

    // Prefer explicit initial focus, then first field, then first button, then panel.
    const preferred =
      initialFocusRef?.current ||
      panelRef.current?.querySelector('input, textarea, select') ||
      panelRef.current?.querySelector('button:not([disabled])') ||
      panelRef.current
    preferred?.focus?.()

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      // Restore focus for keyboard users after close.
      previouslyFocused.current?.focus?.()
    }
  }, [onClose, initialFocusRef])

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-md'
  const motionProps = reduceMotion
    ? { initial: false, animate: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.16 }
      }
  const panelMotion = reduceMotion
    ? { initial: false, animate: { opacity: 1, scale: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, scale: 0.98 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.18, ease: 'easeOut' }
      }

  return createPortal(
    <motion.div
      role="presentation"
      {...motionProps}
      className="teamora-scrim fixed inset-0 z-modal flex items-center justify-center px-4"
      onMouseDown={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={resolvedTitleId}
        aria-describedby={descriptionId || describedBy}
        tabIndex={-1}
        {...panelMotion}
        onMouseDown={(event) => event.stopPropagation()}
        className={clsx(
          'w-full rounded-card border border-border bg-card p-6 shadow-modal outline-none',
          sizeClass,
          className
        )}
      >
        {/* Hidden fallback title when callers don't render a visible heading */}
        {!titleId && !labelledBy ? (
          <span id={autoTitleId} className="sr-only">
            Dialog
          </span>
        ) : null}
        {children}
      </motion.div>
    </motion.div>,
    document.body
  )
}
