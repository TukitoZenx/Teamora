import { useEffect, useState } from 'react'
import useLocalCollabChannel from './useLocalCollabChannel'
import { createMeetingSocket } from '../services/meetingSocket'

/**
 * Shared meeting signaling for a workspace: one hybrid socket (local BC + WS)
 * per workspace, ref-counted so notifications + Meetings UI share it.
 *
 * Acquire/release only in useEffect (not useMemo) so Strict Mode ref counts stay correct.
 * The first localChannel instance wins — later hooks must not tear down the live socket
 * just because they created a different BroadcastChannel object.
 */
const registry = new Map()

function acquire(workspaceId, userName, localChannel, userId) {
  let entry = registry.get(workspaceId)
  if (!entry) {
    entry = {
      socket: createMeetingSocket(localChannel, { workspaceId, userName, userId }),
      localChannel,
      refs: 0
    }
    registry.set(workspaceId, entry)
  }
  entry.refs += 1
  return entry.socket
}

function release(workspaceId) {
  const entry = registry.get(workspaceId)
  if (!entry) return
  entry.refs -= 1
  if (entry.refs <= 0) {
    try {
      entry.socket.destroy?.()
    } catch {
      // ignore
    }
    registry.delete(workspaceId)
  }
}

/**
 * @param {string|undefined} workspaceId
 * @param {string} userName
 * @param {string} [userId]
 */
export default function useMeetingSignaling(workspaceId, userName, userId) {
  const localChannel = useLocalCollabChannel(workspaceId, 'meetings')
  const [socket, setSocket] = useState(null)

  useEffect(() => {
    if (!workspaceId) {
      return undefined
    }
    const s = acquire(workspaceId, userName || 'User', localChannel, userId)
    // Publishing after the current effect avoids a synchronous render cascade
    // while still exposing the socket as soon as the external channel is ready.
    const timer = window.setTimeout(() => setSocket(s), 0)
    return () => {
      window.clearTimeout(timer)
      release(workspaceId)
    }
  }, [workspaceId, localChannel, userName, userId])

  return socket
}
