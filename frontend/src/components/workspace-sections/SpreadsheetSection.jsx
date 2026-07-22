import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react'
import * as Y from 'yjs'
const Spreadsheet = lazy(() => import('../Spreadsheet'))
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { connectRestYjsProvider } from '../../services/restYjsProvider'

const gridStorageKey = (workspaceId, fileId = 'default') => `teamora:collab:${workspaceId}:spreadsheet:${fileId}:grid`

const readGridSnapshot = (workspaceId, fileId) => {
  try {
    const raw = window.localStorage.getItem(gridStorageKey(workspaceId, fileId))
    const parsed = raw ? JSON.parse(raw) : null
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const cellKey = (row, col) => `${row}:${col}`

/**
 * Sparse Y.Map (`row:col` → string) → dense-enough 2D array for Spreadsheet.jsx.
 * Only materializes rows up to the highest occupied index.
 */
const cellsMapToGrid = (cellsMap) => {
  let maxRow = -1
  const entries = []
  cellsMap.forEach((value, key) => {
    if (typeof key !== 'string' || !key.includes(':')) return
    const [rs, cs] = key.split(':')
    const r = Number(rs)
    const c = Number(cs)
    if (!Number.isFinite(r) || !Number.isFinite(c) || r < 0 || c < 0) return
    maxRow = Math.max(maxRow, r)
    entries.push([r, c, value == null ? '' : String(value)])
  })
  if (maxRow < 0) return []
  const grid = Array.from({ length: maxRow + 1 }, () => [])
  for (const [r, c, value] of entries) {
    if (!grid[r]) grid[r] = []
    grid[r][c] = value
  }
  return grid
}

/** Seed a cells map from a legacy 2D grid snapshot (non-empty cells only). */
const seedCellsFromGrid = (ydoc, cellsMap, grid) => {
  if (!Array.isArray(grid) || grid.length === 0) return 0
  let written = 0
  ydoc.transact(() => {
    for (let r = 0; r < grid.length; r += 1) {
      const row = grid[r]
      if (!Array.isArray(row)) continue
      for (let c = 0; c < row.length; c += 1) {
        const value = row[c]
        if (value === undefined || value === null || value === '') continue
        cellsMap.set(cellKey(r, c), String(value))
        written += 1
      }
    }
  })
  return written
}

/**
 * Collaborative Spreadsheet via Yjs cell map + REST content API.
 * Source of truth for cell values is Y.Map('cells'); sheet tab metadata lives
 * on Y.Map('meta') and is also mirrored on the local channel for low-latency
 * same-browser updates.
 */
export default function SpreadsheetSection({ workspaceId, activeFile, onDirtyChange }) {
  const fileId = activeFile?.id || 'default'
  const channel = useLocalCollabChannel(workspaceId, `spreadsheet:${fileId}`)

  const ydocRef = useRef(null)
  const cellsMapRef = useRef(null)
  const metaMapRef = useRef(null)
  const providerRef = useRef(null)
  const onDirtyChangeRef = useRef(onDirtyChange)
  const rebuildRafRef = useRef(null)

  const [grid, setGrid] = useState([])
  const [activeCell, setActiveCell] = useState(null)
  const [roomSettings, setRoomSettingsState] = useState({})

  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange
  }, [onDirtyChange])

  useEffect(() => {
    if (!workspaceId || !activeFile?.id) return undefined

    const contentKey = `spreadsheet:${activeFile.id}`
    const ydoc = new Y.Doc()
    const cells = ydoc.getMap('cells')
    const meta = ydoc.getMap('meta')
    ydocRef.current = ydoc
    cellsMapRef.current = cells
    metaMapRef.current = meta

    const provider = connectRestYjsProvider(ydoc, {
      workspaceId,
      key: contentKey,
      pollMs: 1200
    })
    providerRef.current = provider

    const rebuildGrid = () => {
      setGrid(cellsMapToGrid(cells))
    }

    const scheduleRebuild = () => {
      if (rebuildRafRef.current != null) return
      rebuildRafRef.current = window.requestAnimationFrame(() => {
        rebuildRafRef.current = null
        rebuildGrid()
      })
    }

    const applyMeta = () => {
      const sheetsMetadata = meta.get('sheetsMetadata')
      if (sheetsMetadata && typeof sheetsMetadata === 'object') {
        setRoomSettingsState((current) => ({
          ...current,
          sheetsMetadata
        }))
      }
    }

    cells.observe(scheduleRebuild)
    meta.observe(applyMeta)
    rebuildGrid()
    applyMeta()

    let dirtyTimer = null
    const markDirty = () => {
      onDirtyChangeRef.current?.(true)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      dirtyTimer = window.setTimeout(() => {
        onDirtyChangeRef.current?.(false)
      }, 600)
    }
    const onDocUpdate = (_update, origin) => {
      if (origin !== 'remote') markDirty()
    }
    ydoc.on('update', onDocUpdate)

    let cancelled = false
    const migrateLegacy = async () => {
      try {
        await provider.pull()
        if (cancelled) return
        if (cells.size > 0 || meta.get('legacyGridImported')) {
          rebuildGrid()
          applyMeta()
          return
        }

        const legacy = readGridSnapshot(workspaceId, activeFile.id)
        if (legacy.length > 0) {
          seedCellsFromGrid(ydoc, cells, legacy)
          meta.set('legacyGridImported', true)
          await provider.flush()
        }
      } catch {
        // Offline — try local seed without server.
        if (cancelled) return
        if (cells.size === 0) {
          const legacy = readGridSnapshot(workspaceId, activeFile.id)
          if (legacy.length > 0) {
            seedCellsFromGrid(ydoc, cells, legacy)
            meta.set('legacyGridImported', true)
          }
        }
      } finally {
        if (!cancelled) {
          rebuildGrid()
          applyMeta()
        }
      }
    }
    migrateLegacy()

    // Same-browser sheet metadata snappy path (cells stay Yjs-only).
    const onRemoteSettings = (settings) => {
      if (!settings || typeof settings !== 'object') return
      setRoomSettingsState(settings)
      if (settings.sheetsMetadata && metaMapRef.current) {
        const current = metaMapRef.current.get('sheetsMetadata')
        const incoming = JSON.stringify(settings.sheetsMetadata)
        if (JSON.stringify(current) !== incoming) {
          metaMapRef.current.set('sheetsMetadata', settings.sheetsMetadata)
        }
      }
    }
    channel.on('receive-room-settings', onRemoteSettings)

    return () => {
      cancelled = true
      channel.off('receive-room-settings', onRemoteSettings)
      if (dirtyTimer) window.clearTimeout(dirtyTimer)
      if (rebuildRafRef.current != null) {
        window.cancelAnimationFrame(rebuildRafRef.current)
        rebuildRafRef.current = null
      }
      cells.unobserve(scheduleRebuild)
      meta.unobserve(applyMeta)
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
      cellsMapRef.current = null
      metaMapRef.current = null
    }
  }, [workspaceId, activeFile?.id, channel])

  const handleCellChange = useCallback((row, col, value) => {
    const cells = cellsMapRef.current
    const ydoc = ydocRef.current
    if (!cells || !ydoc) return

    const key = cellKey(row, col)
    const next = value == null ? '' : String(value)
    ydoc.transact(() => {
      if (next === '') {
        if (cells.has(key)) cells.delete(key)
      } else {
        cells.set(key, next)
      }
    })
  }, [])

  const setRoomSettings = useCallback((nextSettings) => {
    setRoomSettingsState(nextSettings)
    const meta = metaMapRef.current
    if (meta && nextSettings?.sheetsMetadata) {
      meta.set('sheetsMetadata', nextSettings.sheetsMetadata)
    }
  }, [])

  return (
    <Suspense
      fallback={<div className="h-full flex items-center justify-center text-muted">Loading Spreadsheet...</div>}
    >
      <Spreadsheet
        grid={grid}
        activeCell={activeCell}
        setActiveCell={setActiveCell}
        handleCellChange={handleCellChange}
        spreadsheetCells={{}}
        socket={channel}
        roomId={workspaceId}
        roomSettings={roomSettings}
        setRoomSettings={setRoomSettings}
      />
    </Suspense>
  )
}
