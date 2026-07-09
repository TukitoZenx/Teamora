import { useEffect, useState } from 'react'
import Spreadsheet from '../Spreadsheet'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

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

const writeGridSnapshot = (workspaceId, fileId, grid) => {
  try {
    window.localStorage.setItem(gridStorageKey(workspaceId, fileId), JSON.stringify(grid))
  } catch {
    // Best-effort persistence only.
  }
}

const setCell = (grid, row, col, value) => {
  const next = grid.slice()
  let existingRow = next[row] ? next[row].slice() : null
  if (!existingRow) {
    existingRow = Array(50).fill('')
  }
  existingRow[col] = value
  next[row] = existingRow
  return next
}

/**
 * Spreadsheet.jsx is fully controlled by its parent (grid/activeCell/settings
 * all come in as props), so this container owns all of it: the grid itself is
 * snapshotted as a whole to localStorage (cell-by-cell deltas are relayed
 * live between tabs via the channel, see localCollabChannel.js), while
 * `roomSettings` (sheet names/offsets) uses the channel's normal
 * persist+replay mechanism directly.
 */
export default function SpreadsheetSection({ workspaceId, activeFile, onDirtyChange }) {
  const fileId = activeFile?.id || 'default'
  const channel = useLocalCollabChannel(workspaceId, `spreadsheet:${fileId}`)

  const [grid, setGrid] = useState(() => readGridSnapshot(workspaceId, fileId))
  const [activeCell, setActiveCell] = useState(null)
  const [roomSettings, setRoomSettingsState] = useState({})

  useEffect(() => {
    channel.on('receive-room-settings', setRoomSettingsState)

    const applyRemoteCell = ({ row, col, value }) => {
      setGrid((current) => {
        const next = setCell(current, row, col, value)
        writeGridSnapshot(workspaceId, fileId, next)
        return next
      })
    }
    channel.on('receive-spreadsheet', applyRemoteCell)

    return () => {
      channel.off('receive-room-settings', setRoomSettingsState)
      channel.off('receive-spreadsheet', applyRemoteCell)
    }
  }, [channel, workspaceId, fileId])

  const setRoomSettings = (nextSettings) => {
    setRoomSettingsState(nextSettings)
  }

  const handleCellChange = (row, col, value) => {
    setGrid((current) => {
      const next = setCell(current, row, col, value)
      writeGridSnapshot(workspaceId, fileId, next)
      return next
    })
    onDirtyChange?.(true)
    channel.emit('update-spreadsheet', { roomId: workspaceId, row, col, value })
    window.setTimeout(() => onDirtyChange?.(false), 300)
  }

  return (
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
  )
}
