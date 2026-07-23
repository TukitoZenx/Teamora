/**
 * Hybrid meeting signaling: BroadcastChannel (same browser) + WebSocket (cross-device).
 * Emits plain JSON-serializable payloads only (SDP/ICE as plain objects).
 */
import { getCollabWebSocketUrl } from './apiBaseUrl'

const log = (...args) => {
  if (typeof console !== 'undefined') console.info('[meeting-signal]', ...args)
}

/** Ensure RTCSessionDescription / RTCIceCandidate are plain JSON. */
export const serializeSignal = (signal) => {
  if (!signal || typeof signal !== 'object') return signal
  const out = { type: signal.type }
  if (signal.sdp) {
    const d = signal.sdp
    out.sdp = typeof d === 'string' ? { type: signal.type, sdp: d } : { type: d.type, sdp: d.sdp }
  }
  if (signal.candidate) {
    const c = signal.candidate
    out.candidate =
      typeof c.toJSON === 'function'
        ? c.toJSON()
        : {
            candidate: c.candidate,
            sdpMid: c.sdpMid,
            sdpMLineIndex: c.sdpMLineIndex,
            usernameFragment: c.usernameFragment
          }
  }
  // copy other fields (from, user, action, participant, allowed, …)
  Object.keys(signal).forEach((k) => {
    if (k !== 'sdp' && k !== 'candidate' && k !== 'type') out[k] = signal[k]
  })
  return out
}

/**
 * @param {object} localChannel
 * @param {{ workspaceId: string, userName?: string }} opts
 */
export function createMeetingSocket(localChannel, { workspaceId, userName }) {
  const listeners = new Map()
  const clientId = localChannel?.id || `meet-${Math.random().toString(36).slice(2, 10)}`
  const localHandlers = new Map()
  let meetingWs = null
  let destroyed = false
  let reconnectTimer = null
  let joined = false
  const pendingEvents = []

  const deliver = (event, value) => {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(value)
      } catch (err) {
        console.error('[meetingSocket] listener error', event, err)
      }
    })
  }

  const bindLocal = (event) => {
    if (localHandlers.has(event) || !localChannel?.on) return
    const handler = (value) => {
      log('local←', event, value?.type || value?.signal?.type || '')
      deliver(event, value)
    }
    localHandlers.set(event, handler)
    localChannel.on(event, handler)
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connectMeetingWs()
    }, 1500)
  }

  const sendWsEvent = (message) => {
    if (!meetingWs || meetingWs.readyState !== WebSocket.OPEN || !joined) return false
    try {
      meetingWs.send(JSON.stringify(message))
      return true
    } catch (err) {
      log('WS send failed', err)
      return false
    }
  }

  const flushPendingEvents = () => {
    while (pendingEvents.length && sendWsEvent(pendingEvents[0])) {
      pendingEvents.shift()
    }
  }

  const connectMeetingWs = () => {
    if (destroyed || !workspaceId) return
    const url = getCollabWebSocketUrl()
    if (!url) {
      log('WS unavailable — local channel only')
      return
    }
    try {
      meetingWs = new WebSocket(url)
    } catch (err) {
      log('WS construct failed', err)
      scheduleReconnect()
      return
    }

    meetingWs.onopen = () => {
      log('WS open', url)
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
      if (msg.type === 'joined') {
        joined = true
        log('WS joined meetings room')
        flushPendingEvents()
        return
      }
      if (msg.type === 'workspace-deleted' && msg.workspaceId === workspaceId) {
        destroyed = true
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        try {
          window.dispatchEvent(
            new CustomEvent('teamora-workspace-deleted', {
              detail: {
                workspaceId,
                message: msg.message || 'This workspace was deleted by the owner.'
              }
            })
          )
        } catch {
          // ignore
        }
        try {
          meetingWs.close()
        } catch {
          // ignore
        }
        return
      }
      if (msg.type === 'error') {
        log('WS rejected', msg.message || 'unknown error')
        if (
          String(msg.message || '')
            .toLowerCase()
            .includes('not a workspace member')
        ) {
          destroyed = true
          try {
            window.dispatchEvent(
              new CustomEvent('teamora-workspace-deleted', {
                detail: { workspaceId, message: 'This workspace was deleted by the owner.' }
              })
            )
          } catch {
            // ignore
          }
        }
        meetingWs?.close()
        return
      }
      if (msg.type === 'meeting-event' && msg.event) {
        if (msg.clientId && msg.clientId === clientId) return
        log('WS←', msg.event, msg.payload?.signal?.type || msg.payload?.socketId || '')
        deliver(msg.event, msg.payload)
      }
      if (msg.type === 'peer-leave' && msg.clientId && msg.clientId !== clientId) {
        log('WS peer-leave', msg.clientId)
        deliver('receive-meeting-leave', msg.clientId)
      }
    }

    meetingWs.onclose = () => {
      log('WS closed')
      joined = false
      meetingWs = null
      if (!destroyed) scheduleReconnect()
    }

    meetingWs.onerror = () => {
      log('WS error')
      try {
        meetingWs?.close()
      } catch {
        // ignore
      }
    }
  }

  connectMeetingWs()

  const fanoutWs = (event, payload) => {
    const message = {
      type: 'meeting-event',
      workspaceId,
      key: 'meetings',
      clientId,
      event,
      payload
    }
    if (sendWsEvent(message)) return true

    // A participant can click Join before the WebSocket receives its room
    // acknowledgement. Preserve the state/SDP until the room is ready rather
    // than silently losing the event.
    pendingEvents.push(message)
    if (pendingEvents.length > 200) pendingEvents.shift()
    return false
  }

  const clearPendingEvents = () => {
    pendingEvents.length = 0
  }

  const closeMeetingWs = () => {
    clearPendingEvents()
    try {
      meetingWs?.close()
    } catch {
      // ignore
    }
  }

  return {
    id: clientId,
    get readyState() {
      return meetingWs?.readyState
    },
    isWsJoined: () => joined,
    emit(event, value) {
      // Local same-browser path
      try {
        localChannel?.emit?.(event, value)
      } catch (err) {
        log('local emit failed', event, err)
      }

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
          signal: serializeSignal(value?.signal)
        }
      } else if (event === 'meeting-claim-host') {
        receiveEvent = 'receive-meeting-host'
        payload = value
      } else if (event === 'meeting-started') {
        receiveEvent = 'receive-meeting-started'
        payload = { ...value, organizerId: clientId }
      } else if (event === 'meeting-ended') {
        receiveEvent = 'receive-meeting-ended'
        payload = value
      } else if (event === 'send-message') {
        receiveEvent = 'receive-message'
        payload = { ...value, senderSocketId: clientId }
      }

      log('→', event, payload?.signal?.type || payload?.user || payload?.socketId || '')
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
      closeMeetingWs()
    }
  }
}
