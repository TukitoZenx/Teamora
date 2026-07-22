import { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import * as Y from 'yjs'
const Whiteboard = lazy(() => import('../Whiteboard'))
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { connectRestYjsProvider } from '../../services/restYjsProvider'

const legacyElementsStorageKey = (workspaceId, fileId) =>
  `teamora:collab:${workspaceId}:whiteboard:${fileId}::receive-whiteboard-elements`

const readLegacyElements = (workspaceId, fileId) => {
  try {
    const raw = window.localStorage.getItem(legacyElementsStorageKey(workspaceId, fileId))
    if (raw == null) return null
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Materialize Y.Map → ordered elements array for Whiteboard.jsx. */
const elementsFromMap = (elementsMap) => {
  const list = []
  elementsMap.forEach((value, key) => {
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
 * Apply a full local elements array to the shared map without deleting
 * remote-only ids (ids never seen in the previous local snapshot).
 */
const applyLocalElementsArray = (ydoc, elementsMap, nextArray, prevArray) => {
  const next = Array.isArray(nextArray) ? nextArray : []
  const prevIds = new Set((Array.isArray(prevArray) ? prevArray : []).map((el) => el?.id).filter(Boolean))
  const nextIds = new Set()

  ydoc.transact(() => {
    next.forEach((el, index) => {
      if (!el || typeof el !== 'object' || !el.id) return
      nextIds.add(el.id)
      elementsMap.set(el.id, { ...el, order: index })
    })
    for (const id of prevIds) {
      if (!nextIds.has(id) && elementsMap.has(id)) {
        elementsMap.delete(id)
      }
    }
  })
}

const seedMapFromElements = (ydoc, elementsMap, list) => {
  if (!Array.isArray(list) || list.length === 0) return 0
  let n = 0
  ydoc.transact(() => {
    list.forEach((el, index) => {
      if (!el || typeof el !== 'object' || !el.id) return
      elementsMap.set(el.id, { ...el, order: index })
      n += 1
    })
  })
  return n
}

/**
 * Collaborative Whiteboard via Yjs element map + REST content API.
 * Whiteboard.jsx keeps its array-based UI; this section supplies a socket
 * facade that maps full-array updates onto differential Y.Map ops.
 */
export default function WhiteboardSection({ workspaceId, userName, activeFile, onDirtyChange }) {
  const canvasRef = useRef(null)
  const fileId = activeFile?.id || 'default'
  const channel = useLocalCollabChannel(workspaceId, `whiteboard:${fileId}`)

  const [myColor, setMyColor] = useState('#000000')
  const [whiteboardTool, setWhiteboardTool] = useState('pen')
  const [whiteboardSize, setWhiteboardSize] = useState(4)

  const onDirtyChangeRef = useRef(onDirtyChange)
  const implRef = useRef(null)
  const listenerBufferRef = useRef(new Map())

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  // Stable socket API for Whiteboard; implementation is swapped per open file.
  const collabSocket = useMemo(
    () => ({
      emit(event, value) {
        implRef.current?.emit(event, value)
      },
      on(event, handler) {
        if (!listenerBufferRef.current.has(event)) {
          listenerBufferRef.current.set(event, new Set())
        }
        listenerBufferRef.current.get(event).add(handler)
        implRef.current?.on(event, handler)
      },
      off(event, handler) {
        if (!handler) {
          listenerBufferRef.current.delete(event)
          implRef.current?.off(event)
          return
        }
        listenerBufferRef.current.get(event)?.delete(handler)
        implRef.current?.off(event, handler)
      },
      destroy() {}
    }),
    []
  )

  useEffect(() => {
    if (!workspaceId || !activeFile?.id) {
      implRef.current = null
      return undefined
    }

    const contentKey = `whiteboard:${activeFile.id}`
    const ydoc = new Y.Doc()
    const elementsMap = ydoc.getMap('elements')
    const meta = ydoc.getMap('meta')

    const provider = connectRestYjsProvider(ydoc, {
      workspaceId,
      key: contentKey,
      pollMs: 1200
    })

    const listeners = new Map()
    const deliver = (event, value) => {
      listeners.get(event)?.forEach((handler) => {
        try {
          handler(value)
        } catch (error) {
          console.error(`[whiteboard-collab] listener for "${event}" threw`, error)
        }
      })
    }

    let localSnapshot = []
    let rebuildRaf = null
    let dirtyTimer = null

    const rebuildFromMap = () => {
      localSnapshot = elementsFromMap(elementsMap)
      deliver('receive-whiteboard-elements', localSnapshot)
    }

    const scheduleRebuild = () => {
      if (rebuildRaf != null) return
      rebuildRaf = window.requestAnimationFrame(() => {
        rebuildRaf = null
        rebuildFromMap()
      })
    }

    const onMapChange = () => scheduleRebuild()
    elementsMap.observe(onMapChange)

    const markDirty = () => {
      onDirtyChangeRef.current?.(true)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      dirtyTimer = window.setTimeout(() => onDirtyChangeRef.current?.(false), 600)
    }
    const onDocUpdate = (_u, origin) => {
      if (origin !== 'remote') markDirty()
    }
    ydoc.on('update', onDocUpdate)

    const relayDrawLine = (payload) => deliver('receive-draw-line', payload)
    const relayClear = () => {
      deliver('receive-clear-board', undefined)
    }
    channel.on('receive-draw-line', relayDrawLine)
    channel.on('receive-clear-board', relayClear)

    const impl = {
      emit(event, value) {
        if (event === 'update-whiteboard-elements') {
          const next = Array.isArray(value?.elements) ? value.elements : Array.isArray(value) ? value : []
          applyLocalElementsArray(ydoc, elementsMap, next, localSnapshot)
          localSnapshot = next
            .map((el, index) => (el && typeof el === 'object' ? { ...el, order: index } : null))
            .filter(Boolean)
          return
        }
        if (event === 'draw-line') {
          channel.emit('draw-line', value)
          return
        }
        if (event === 'clear-board') {
          ydoc.transact(() => {
            Array.from(elementsMap.keys()).forEach((key) => elementsMap.delete(key))
          })
          channel.emit('clear-board', value)
          return
        }
        if (event === 'file-content-update') {
          return
        }
        channel.emit(event, value)
      },
      on(event, handler) {
        if (!listeners.has(event)) listeners.set(event, new Set())
        listeners.get(event).add(handler)
        if (event === 'receive-whiteboard-elements') {
          handler(elementsFromMap(elementsMap))
        }
      },
      off(event, handler) {
        if (!handler) {
          listeners.delete(event)
          return
        }
        listeners.get(event)?.delete(handler)
      }
    }

    // Attach any handlers Whiteboard already registered on the stable facade.
    for (const [event, handlers] of listenerBufferRef.current.entries()) {
      for (const handler of handlers) {
        impl.on(event, handler)
      }
    }
    implRef.current = impl

    let cancelled = false
    const migrateLegacy = async () => {
      try {
        await provider.pull()
        if (cancelled) return
        if (elementsMap.size > 0 || meta.get('legacyElementsImported')) {
          rebuildFromMap()
          return
        }
        const legacy = readLegacyElements(workspaceId, activeFile.id)
        if (legacy && legacy.length > 0) {
          seedMapFromElements(ydoc, elementsMap, legacy)
          meta.set('legacyElementsImported', true)
          await provider.flush()
        }
      } catch {
        if (cancelled) return
        if (elementsMap.size === 0) {
          const legacy = readLegacyElements(workspaceId, activeFile.id)
          if (legacy && legacy.length > 0) {
            seedMapFromElements(ydoc, elementsMap, legacy)
            meta.set('legacyElementsImported', true)
          }
        }
      } finally {
        if (!cancelled) rebuildFromMap()
      }
    }
    migrateLegacy()

    return () => {
      cancelled = true
      if (implRef.current === impl) implRef.current = null
      channel.off('receive-draw-line', relayDrawLine)
      channel.off('receive-clear-board', relayClear)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      if (rebuildRaf != null) window.cancelAnimationFrame(rebuildRaf)
      elementsMap.unobserve(onMapChange)
      ydoc.off('update', onDocUpdate)
      try {
        provider.flush?.()
      } catch {
        // ignore
      }
      provider.destroy?.()
      ydoc.destroy()
    }
  }, [workspaceId, activeFile?.id, channel])

  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center text-muted">Loading Whiteboard...</div>}>
      <Whiteboard
        key={fileId}
        canvasRef={canvasRef}
        myColor={myColor}
        setMyColor={setMyColor}
        whiteboardTool={whiteboardTool}
        setWhiteboardTool={setWhiteboardTool}
        whiteboardSize={whiteboardSize}
        setWhiteboardSize={setWhiteboardSize}
        whiteboardCursors={{}}
        socket={collabSocket}
        roomId={workspaceId}
        userName={userName}
        onDirtyChange={onDirtyChange}
      />
    </Suspense>
  )
}
