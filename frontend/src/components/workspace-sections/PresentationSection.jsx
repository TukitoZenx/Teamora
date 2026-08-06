import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import * as Y from 'yjs'
const PresentationModule = lazy(() => import('../presentation/PresentationModule'))
import PresentationErrorBoundary from '../presentation/PresentationErrorBoundary'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { connectRestYjsProvider } from '../../services/restYjsProvider'
import { compressSlidesImages } from '../presentation/utils/compressImage'

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

const cloneElement = (el) => {
  if (!el || typeof el !== 'object') return el
  try {
    return { ...el, children: Array.isArray(el.children) ? el.children.map((c) => ({ ...c })) : el.children }
  } catch {
    return el
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
      elements: Array.isArray(slide.elements) ? slide.elements.map(cloneElement) : [],
      layout: slide.layout || 'title',
      hidden: Boolean(slide.hidden),
      section: slide.section ?? null,
      order: Number.isFinite(slide.order) ? slide.order : index
    }
  })
}

const slidesFromMap = (slidesMap) => {
  const list = []
  try {
    slidesMap.forEach((value, key) => {
      if (!value || typeof value !== 'object') return
      let plain
      try {
        // Prefer shallow-ish copy; avoid double JSON of huge base64 when possible
        plain = { ...value }
        if (Array.isArray(value.elements)) {
          plain.elements = value.elements.map(cloneElement)
        }
      } catch {
        plain = { id: key }
      }
      const id = typeof plain.id === 'string' && plain.id ? plain.id : key
      list.push({
        ...plain,
        id,
        elements: Array.isArray(plain.elements) ? plain.elements : []
      })
    })
  } catch (err) {
    console.error('slidesFromMap failed', err)
  }
  list.sort((a, b) => {
    const ao = Number.isFinite(a.order) ? a.order : 0
    const bo = Number.isFinite(b.order) ? b.order : 0
    if (ao !== bo) return ao - bo
    return String(a.id).localeCompare(String(b.id))
  })
  return list
}

const writeSlidesToYjs = (ydoc, slidesMap, nextArray, prevArray) => {
  const next = ensureSlideIds(nextArray)
  const prevIds = new Set((Array.isArray(prevArray) ? prevArray : []).map((s) => s?.id).filter(Boolean))
  const nextIds = new Set()

  try {
    ydoc.transact(() => {
      next.forEach((slide, index) => {
        nextIds.add(slide.id)
        // Store plain object reference copy — Yjs will encode on update
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
    }, 'local')
  } catch (err) {
    console.error('writeSlidesToYjs failed', err)
  }
  return next
}

/**
 * Collaborative Presentation — React state is source of truth while editing.
 * Yjs writes are debounced so drag/type never blocks or crashes the UI.
 */
export default function PresentationSection({ workspaceId, activeFile, onDirtyChange }) {
  const fileId = activeFile?.id || 'default'
  const channel = useLocalCollabChannel(workspaceId, `presentation:${fileId}`)

  const ydocRef = useRef(null)
  const slidesMapRef = useRef(null)
  const providerRef = useRef(null)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const rebuildRafRef = useRef(null)
  const skipRemoteRef = useRef(false)
  const slidesRef = useRef([blankSlide()])
  const yjsFlushTimerRef = useRef(null)
  const editorKeyRef = useRef(0)

  const [slides, setSlidesState] = useState(() => [blankSlide()])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)
  const [editorKey, setEditorKey] = useState(0)

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  useEffect(() => {
    slidesRef.current = slides
  }, [slides])

  const flushToYjs = useCallback(async (list) => {
    const ydoc = ydocRef.current
    const slidesMap = slidesMapRef.current
    if (!ydoc || !slidesMap) return
    skipRemoteRef.current = true
    try {
      // Re-compress any oversized base64 images before durable save
      let safeList = list
      try {
        safeList = await compressSlidesImages(list)
      } catch {
        safeList = list
      }
      writeSlidesToYjs(ydoc, slidesMap, safeList, slidesRef.current)
      slidesRef.current = ensureSlideIds(safeList)
    } finally {
      // allow remote rebuilds after a tick
      window.setTimeout(() => {
        skipRemoteRef.current = false
      }, 50)
    }
    try {
      await providerRef.current?.flush?.()
    } catch {
      // offline / 413 handled in provider
    }
  }, [])

  const scheduleYjsFlush = useCallback(
    (list) => {
      if (yjsFlushTimerRef.current) window.clearTimeout(yjsFlushTimerRef.current)
      yjsFlushTimerRef.current = window.setTimeout(() => {
        yjsFlushTimerRef.current = null
        flushToYjs(list)
      }, 500)
    },
    [flushToYjs]
  )

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
      pollMs: 3000
    })
    providerRef.current = provider

    const applyRemoteList = (list) => {
      if (skipRemoteRef.current) return
      const next = list.length > 0 ? ensureSlideIds(list) : [blankSlide()]
      slidesRef.current = next
      setSlidesState(next)
      setActiveSlide((idx) => Math.min(idx, Math.max(0, next.length - 1)))
    }

    const rebuildFromMap = () => {
      if (skipRemoteRef.current) return
      applyRemoteList(slidesFromMap(slidesMap))
    }

    const scheduleRebuild = () => {
      if (skipRemoteRef.current) return
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
      if (origin === 'remote') scheduleRebuild()
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
        skipRemoteRef.current = true
        if (legacy && legacy.length > 0) {
          writeSlidesToYjs(ydoc, slidesMap, legacy, [])
          meta.set('legacySlidesImported', true)
          await provider.flush()
        } else {
          writeSlidesToYjs(ydoc, slidesMap, [blankSlide()], [])
        }
        skipRemoteRef.current = false
      } catch {
        if (cancelled) return
        if (slidesMap.size === 0) {
          const legacy = readLegacySlides(workspaceId, activeFile.id)
          skipRemoteRef.current = true
          if (legacy && legacy.length > 0) {
            writeSlidesToYjs(ydoc, slidesMap, legacy, [])
            meta.set('legacySlidesImported', true)
          } else {
            writeSlidesToYjs(ydoc, slidesMap, [blankSlide()], [])
          }
          skipRemoteRef.current = false
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
      if (yjsFlushTimerRef.current) window.clearTimeout(yjsFlushTimerRef.current)
      if (rebuildRafRef.current != null) {
        window.cancelAnimationFrame(rebuildRafRef.current)
        rebuildRafRef.current = null
      }
      // flush latest local state once on unmount
      try {
        flushToYjs(slidesRef.current)
      } catch {
        // ignore
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
  }, [workspaceId, activeFile?.id, channel, flushToYjs])

  /**
   * Immediate React state update (edit path). Yjs is debounced.
   */
  const setSlides = useCallback(
    (next) => {
      setSlidesState((current) => {
        try {
          const resolved = typeof next === 'function' ? next(current) : next
          const normalized = ensureSlideIds(resolved)
          slidesRef.current = normalized
          scheduleYjsFlush(normalized)
          return normalized
        } catch (err) {
          console.error('setSlides failed', err)
          return current
        }
      })
    },
    [scheduleYjsFlush]
  )

  const persistSlides = useCallback(
    async (snapshot) => {
      const list = ensureSlideIds(snapshot)
      slidesRef.current = list
      setSlidesState(list)
      if (yjsFlushTimerRef.current) {
        window.clearTimeout(yjsFlushTimerRef.current)
        yjsFlushTimerRef.current = null
      }
      flushToYjs(list)
    },
    [flushToYjs]
  )

  const resetEditor = useCallback(() => {
    setIsPresenting(false)
    setActiveSlide(0)
    editorKeyRef.current += 1
    setEditorKey(editorKeyRef.current)
  }, [])

  return (
    <PresentationErrorBoundary onReset={resetEditor}>
      <Suspense
        fallback={<div className="flex h-full items-center justify-center text-muted">Loading Presentation...</div>}
      >
        <PresentationModule
          key={`presentation-editor-${editorKey}`}
          slides={slides}
          setSlides={setSlides}
          activeSlide={activeSlide}
          setActiveSlide={setActiveSlide}
          isPresenting={isPresenting}
          setIsPresenting={setIsPresenting}
          roomId={workspaceId}
          socket={channel}
          activeUsers={[]}
          onPersist={persistSlides}
        />
      </Suspense>
    </PresentationErrorBoundary>
  )
}
