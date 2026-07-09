import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import clsx from 'clsx'

export default function Modal({ children, onClose, className, size = 'md' }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()

      if (event.key === 'Tab') {
        const focusableElements = panelRef.current?.querySelectorAll(
          'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        )
        if (!focusableElements || focusableElements.length === 0) return

        const first = focusableElements[0]
        const last = focusableElements[focusableElements.length - 1]

        if (event.shiftKey) {
          if (document.activeElement === first) {
            last.focus()
            event.preventDefault()
          }
        } else if (document.activeElement === last) {
          first.focus()
          event.preventDefault()
        }
      }
    }

    const firstInput =
      panelRef.current?.querySelector('input, textarea, select') || panelRef.current?.querySelector('button')
    firstInput?.focus()

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : size === 'xl' ? 'max-w-4xl' : 'max-w-md'

  return (
    <motion.div
      role="presentation"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="teamora-scrim fixed inset-0 z-modal flex items-center justify-center px-4"
      onMouseDown={onClose}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
        className={clsx('w-full rounded-card border border-border bg-card p-6 shadow-modal', sizeClass, className)}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
