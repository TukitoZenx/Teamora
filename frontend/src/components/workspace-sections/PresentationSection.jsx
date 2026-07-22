import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import * as Y from 'yjs'
const PresentationModule = lazy(() => import('../presentation/PresentationModule'))
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { connectRestYjsProvider } from '../../services/restYjsProvider'

const newSlideId = () => `slide-${Math.random().toString(36).slice(2, 10)}`

const blankSlide = (overrides = {}) => ({
  id: newSlideId(),
  title: 'Click to add title',
  content: 'Click to add text',
  notes: '',
  elements: [],
  layout: 'title',
  hidden: false,
  section: null,
  ...overrides
})

const legacySlidesStorageKey = (workspaceId, fileId) =>
  `teamora:collab:${workspaceId}:presentation:${fileId}::receive-slides-list`

const readLegacySlides = (workspaceId, fileId) => {
  try {
    const raw = window.localStorage.getItem(legacySlidesStorageKey(workspaceId, fileId))
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

const ensureSlideIds = (list) => {
  if (!Array.isArray(list) || list.length === 0) return [blankSlide()]
  return list.map((slide, index) => {
    if (!slide || typeof slide !== 'object') {
      return { ...blankSlide(), order: index }
    }
    return {
      id: typeof slide.id === 'string' && slide.id ? slide.id : newSlideId(),
      title: slide.title ?? 'Click to add title',
      content: slide.content ?? 'Click to add text',
      notes: slide.notes ?? '',
      elements: Array.isArray(slide.elements) ? slide.elements : [],
      layout: slide.layout || 'title',
      hidden: Boolean(slide.hidden),
      section: slide.section ?? null,
      order: Number.isFinite(slide.order) ? slide.order : index
    }
  })
}

const slidesFromMap = (slidesMap) => {
  const list = []
  slidesMap.forEach((value, key) => {
    if (!value || typeof value !== 'object') return
    const id = typeof value.id === 'string' ? value.id : key
    list.push({ ...value, id })
  })
  list.sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 0
    const bo = Number.isFinite(b.order) ? b.order : 0
    if (ao !== bo) return ao - bo
    return String(a.id).localeCompare(String(b.id))
  })
  return list
}

/**
 * Apply a full local slides array without deleting remote-only slide ids.
 */
const applyLocalSlidesArray = (ydoc, slidesMap, nextArray, prevArray) => {
  const next = ensureSlideIds(nextArray)
  const prevIds = new Set((Array.isArray(prevArray) ? prevArray : []).map((s) => s?.id).filter(Boolean))
  const nextIds = new Set()

  ydoc.transact(() => {
    next.forEach((slide, index) => {
      nextIds.add(slide.id)
      slidesMap.set(slide.id, {
        ...slide,
        elements: Array.isArray(slide.elements) ? slide.elements.map((el) => ({ ...el })) : [],
        order: index
      })
    })
    for (const id of prevIds) {
      if (!nextIds.has(id) && slidesMap.has(id)) {
        slidesMap.delete(id)
      }
    }
  })
  return next
}

const seedMapFromSlides = (ydoc, slidesMap, list) => {
  const normalized = ensureSlideIds(list)
  ydoc.transact(() => {
    normalized.forEach((slide, index) => {
      slidesMap.set(slide.id, { ...slide, order: index })
    })
  })
  return normalized
}

/**
 * Collaborative Presentation via Yjs slide map + REST content API.
 * Parent owns slides state; Slides.jsx remains a controlled view.
 */
export default function PresentationSection({ workspaceId, activeFile, onDirtyChange }) {
  const fileId = activeFile?.id || 'default'
  const channel = useLocalCollabChannel(workspaceId, `presentation:${fileId}`)

  const ydocRef = useRef(null)
  const slidesMapRef = useRef(null)
  const providerRef = useRef(null)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const rebuildRafRef = useRef(null)

  const [slides, setSlidesState] = useState(() => [blankSlide()])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  useEffect(() => {
    if (!workspaceId || !activeFile?.id) return undefined

    const contentKey = `presentation:${activeFile.id}`
    const ydoc = new Y.Doc()
    const slidesMap = ydoc.getMap('slides')
    const meta = ydoc.getMap('meta')
    ydocRef.current = ydoc
    slidesMapRef.current = slidesMap

    const provider = connectRestYjsProvider(ydoc, {
      workspaceId,
      key: contentKey,
      pollMs: 1200
    })
    providerRef.current = provider

    const applyRemoteList = (list) => {
      const next = list.length > 0 ? list : [blankSlide()]
      setSlidesState(next)
      setActiveSlide((idx) => Math.min(idx, Math.max(0, next.length - 1)))
    }

    const rebuildFromMap = () => {
      applyRemoteList(slidesFromMap(slidesMap))
    }

    const scheduleRebuild = () => {
      if (rebuildRafRef.current != null) return
      rebuildRafRef.current = window.requestAnimationFrame(() => {
        rebuildRafRef.current = null
        rebuildFromMap()
      })
    }

    slidesMap.observe(scheduleRebuild)

    let dirtyTimer = null
    const markDirty = () => {
      onDirtyChangeRef.current?.(true)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      dirtyTimer = window.setTimeout(() => onDirtyChangeRef.current?.(false), 600)
    }
    const onDocUpdate = (_u, origin) => {
      if (origin !== 'remote') markDirty()
    }
    ydoc.on('update', onDocUpdate)

    const onSlideChange = (payload = {}) => {
      const slideIndex = payload?.slideIndex
      if (typeof slideIndex === 'number' && slideIndex >= 0) {
        setActiveSlide(slideIndex)
      }
    }
    channel.on('receive-slide-change', onSlideChange)

    let cancelled = false
    const migrateLegacy = async () => {
      try {
        await provider.pull()
        if (cancelled) return
        if (slidesMap.size > 0 || meta.get('legacySlidesImported')) {
          rebuildFromMap()
          return
        }
        const legacy = readLegacySlides(workspaceId, activeFile.id)
        if (legacy && legacy.length > 0) {
          seedMapFromSlides(ydoc, slidesMap, legacy)
          meta.set('legacySlidesImported', true)
          await provider.flush()
        } else {
          seedMapFromSlides(ydoc, slidesMap, [blankSlide()])
        }
      } catch {
        if (cancelled) return
        if (slidesMap.size === 0) {
          const legacy = readLegacySlides(workspaceId, activeFile.id)
          if (legacy && legacy.length > 0) {
            seedMapFromSlides(ydoc, slidesMap, legacy)
            meta.set('legacySlidesImported', true)
          }
        }
      } finally {
        if (!cancelled) rebuildFromMap()
      }
    }
    migrateLegacy()

    return () => {
      cancelled = true
      channel.off('receive-slide-change', onSlideChange)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      if (rebuildRafRef.current != null) {
        window.cancelAnimationFrame(rebuildRafRef.current)
        rebuildRafRef.current = null
      }
      slidesMap.unobserve(scheduleRebuild)
      ydoc.off('update', onDocUpdate)
      try {
        provider.flush?.()
      } catch {
        // ignore
      }
      provider.destroy?.()
      providerRef.current = null
      ydoc.destroy()
      ydocRef.current = null
      slidesMapRef.current = null
    }
  }, [workspaceId, activeFile?.id, channel])

  const setSlides = useCallback((next) => {
    setSlidesState((current) => {
      const resolved = typeof next === 'function' ? next(current) : next
      const ydoc = ydocRef.current
      const slidesMap = slidesMapRef.current

      if (!ydoc || !slidesMap) {
        return ensureSlideIds(resolved)
      }

      return applyLocalSlidesArray(ydoc, slidesMap, resolved, current)
    })
  }, [])


  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Loading Presentation...</div>}>
      <PresentationModule
        slides={slides}
        setSlides={setSlides}
        activeSlide={activeSlide}
        setActiveSlide={setActiveSlide}
        isPresenting={isPresenting}
        setIsPresenting={setIsPresenting}
        roomId={workspaceId}
        socket={channel}
        activeUsers={[]}
      />
    </Suspense>
  )
}
