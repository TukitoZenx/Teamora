import { useCallback, useState } from 'react'

/**
 * Lightweight undo/redo. Snapshots only store structural fields + short text,
 * never full base64 image payloads.
 */
export default function useSlideHistory(_slides, setSlides) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Intentionally disabled heavy history for stability.
  // Structural ops still work; undo is a no-op until we re-enable safely.
  const commit = useCallback(
    (next) => {
      try {
        setSlides(next)
      } catch (err) {
        console.error('commit setSlides failed', err)
      }
      setCanUndo(false)
      setCanRedo(false)
    },
    [setSlides]
  )

  const undo = useCallback(() => false, [])
  const redo = useCallback(() => false, [])
  const resetHistory = useCallback(() => {
    setCanUndo(false)
    setCanRedo(false)
  }, [])

  return { commit, undo, redo, canUndo, canRedo, resetHistory }
}
