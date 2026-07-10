/**
 * Hybrid meeting signaling: localCollabChannel (same-browser tabs) + WebSocket
 * (cross-device) so multiple participants can join the same room.
 */
import { connectCollabSocket } from './collabSocket'

/**
 * @param {object} localChannel - createLocalCollabChannel result
 * @param {{ workspaceId: string, userName?: string }} opts
 */
export function createMeetingSocket(localChannel, { workspaceId, userName }) {
  const listeners = new Map()
  const clientId = localChannel?.id || `meet-${Math.random().toString(36).slice(2, 10)}`

  const deliver = (event, value) => {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(value)
      } catch (err) {
        console.error('[meetingSocket]', event, err)
      }
    })
  }

  // Bridge local channel events into our listeners
  const localHandlers = new Map()
  const bindLocal = (event) => {
    if (localHandlers.has(event)) return
    const handler = (value) => deliver(event, value)
    localHandlers.set(event, handler)
    localChannel?.on?.(event, handler)
  }

  const ws = connectCollabSocket(
    {
      workspaceId,
      key: 'meetings',
      user: { name: userName || 'User', clientId }
    },
    {
      onAwareness: () => {},
      onYjsUpdate: () => {},
      onPeerLeave: (peerClientId) => {
        deliver('receive-meeting-leave', peerClientId)
      },
      onStatus: () => {}
    }
  )

  // Intercept raw WS messages for meeting protocol by wrapping send/on
  // collabSocket doesn't expose raw message handlers for custom types beyond
  // yjs/awareness — so we open a parallel lightweight listener via the same
  // join room using a second small socket for meeting-only fanout.
  let meetingWs = null
  let destroyed = false
  let reconnectTimer = null

  const getWsUrl = () => {
    try {
      const base =
        import.meta.env.VITE_API_URL ||
        (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')
          ? 'https://teamora-3vgk.onrender.com'
          : 'http://localhost:5000')
      const u = new URL(base)
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
      u.pathname = '/collab'
      return u.toString()
    } catch {
      return null
    }
  }

  const connectMeetingWs = () => {
    if (destroyed || !workspaceId) return
    const url = getWsUrl()
    if (!url) return
    try {
      meetingWs = new WebSocket(url)
    } catch {
      scheduleReconnect()
      return
    }
    meetingWs.onopen = () => {
      meetingWs.send(
        JSON.stringify({
          type: 'join',
          workspaceId,
          key: 'meetings',
          user: { name: userName || 'User', clientId }
        })
      )
    }
    meetingWs.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(String(ev.data))
      } catch {
        return
      }
      if (!msg || msg.key && msg.key !== 'meetings' && msg.type !== 'joined') return

      if (msg.type === 'meeting-event' && msg.event) {
        // Avoid double-echo of our own events when clientId matches
        if (msg.clientId && msg.clientId === clientId) return
        deliver(msg.event, msg.payload)
      }
      if (msg.type === 'peer-leave' && msg.clientId) {
        deliver('receive-meeting-leave', msg.clientId)
      }
    }
    meetingWs.onclose = () => {
      meetingWs = null
      if (!destroyed) scheduleReconnect()
    }
    meetingWs.onerror = () => {
      try {
        meetingWs?.close()
      } catch {
        // ignore
      }
    }
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connectMeetingWs()
    }, 1500)
  }

  connectMeetingWs()

  const fanoutWs = (event, payload) => {
    if (!meetingWs || meetingWs.readyState !== WebSocket.OPEN) return
    try {
      meetingWs.send(
        JSON.stringify({
          type: 'meeting-event',
          workspaceId,
          key: 'meetings',
          clientId,
          event,
          payload
        })
      )
    } catch {
      // ignore
    }
  }

  return {
    id: clientId,
    get readyState() {
      return meetingWs?.readyState
    },
    emit(event, value) {
      // Local same-browser
      localChannel?.emit?.(event, value)

      // Map to receive events for WS peers (mirror localCollabChannel transforms lightly)
      let receiveEvent = event
      let payload = value
      if (event === 'meeting-join') {
        receiveEvent = 'receive-meeting-join'
        payload = value?.participant || value
      } else if (event === 'meeting-leave') {
        receiveEvent = 'receive-meeting-leave'
        payload = value?.socketId || clientId
      } else if (event === 'meeting-state-change') {
        receiveEvent = 'receive-meeting-state-change'
        payload = { socketId: clientId, state: value?.state || value }
      } else if (event === 'meeting-signal') {
        receiveEvent = 'receive-meeting-signal'
        payload = {
          senderSocketId: clientId,
          targetSocketId: value?.targetSocketId,
          signal: value?.signal
        }
      } else if (event === 'meeting-claim-host') {
        receiveEvent = 'receive-meeting-host'
        payload = value
      } else if (event === 'send-message') {
        receiveEvent = 'receive-message'
        payload = { ...value, senderSocketId: clientId }
      }

      fanoutWs(receiveEvent, payload)
    },
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)
      bindLocal(event)
    },
    off(event, handler) {
      if (!handler) {
        listeners.delete(event)
        return
      }
      listeners.get(event)?.delete(handler)
    },
    destroy() {
      destroyed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      for (const [event, handler] of localHandlers) {
        localChannel?.off?.(event, handler)
      }
      localHandlers.clear()
      try {
        meetingWs?.close()
      } catch {
        // ignore
      }
      ws?.destroy?.()
    }
  }
}
