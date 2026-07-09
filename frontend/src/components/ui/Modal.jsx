import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'

export default function Modal({ children, onClose }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()

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
        } else {
          if (document.activeElement === last) {
            first.focus()
            event.preventDefault()
          }
        }
      }
    }

    const firstInput =
      panelRef.current?.querySelector('input, textarea, select') || panelRef.current?.querySelector('button')
    firstInput?.focus()

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16 }}
      className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/40 dark:bg-black/60 px-4 backdrop-blur-[10px]"
      onMouseDown={onClose}
    >
      <motion.div
        ref={panelRef}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-card border border-border bg-card p-6 shadow-modal"
      >
        {children}
      </motion.div>
    </motion.div>
  )
}
