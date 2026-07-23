/**
 * Shared WebSocket client for collab fanout (Yjs updates + awareness).
 * REST remains the durable store; this is optional low-latency push.
 */
import { getCollabWebSocketUrl } from './apiBaseUrl'

const PRESENCE_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#0ea5e9']

export const pickPresenceColor = (seed = '') => {
  let hash = 0
  const s = String(seed)
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

/**
 * @param {{ workspaceId: string, key: string, user?: { name?: string, color?: string, clientId?: string } }} opts
 * @param {{ onYjsUpdate?: (b64: string) => void, onAwareness?: (msg: object) => void, onPeerLeave?: (clientId: string) => void, onStatus?: (status: string) => void }} handlers
 */
export function connectCollabSocket(opts, handlers = {}) {
  const { workspaceId, key, user = {} } = opts
  const clientId = user.clientId || `c-${Math.random().toString(36).slice(2, 10)}`
  const userMeta = {
    name: user.name || 'User',
    color: user.color || pickPresenceColor(user.name || clientId),
    clientId
  }

  let ws = null
  let destroyed = false
  let reconnectTimer = null
  let joined = false

  const status = (s) => handlers.onStatus?.(s)

  const send = (msg) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) return false
    try {
      ws.send(JSON.stringify(msg))
      return true
    } catch {
      return false
    }
  }

  const connect = () => {
    if (destroyed) return
    const url = getCollabWebSocketUrl()
    if (!url || !workspaceId || !key) {
      status('unavailable')
      return
    }

    status('connecting')
    try {
      ws = new WebSocket(url)
    } catch {
      status('error')
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      if (destroyed) {
        ws.close()
        return
      }
      status('open')
      send({
        type: 'join',
        workspaceId,
        key,
        user: userMeta
      })
    }

    ws.onmessage = (event) => {
      let msg
      try {
        msg = JSON.parse(String(event.data))
      } catch {
        return
      }
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'joined') {
        joined = true
        status('joined')
        return
      }
      if (msg.type === 'yjs-update' && typeof msg.update === 'string') {
        if (msg.workspaceId === workspaceId && msg.key === key) {
          handlers.onYjsUpdate?.(msg.update)
        }
        return
      }
      if (msg.type === 'awareness') {
        if (msg.workspaceId === workspaceId && msg.key === key && msg.clientId !== clientId) {
          handlers.onAwareness?.(msg)
        }
        return
      }
      if (msg.type === 'peer-leave' && msg.clientId) {
        handlers.onPeerLeave?.(msg.clientId)
        return
      }
      if (msg.type === 'workspace-deleted' && msg.workspaceId === workspaceId) {
        destroyed = true
        if (reconnectTimer) {
          window.clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
        handlers.onWorkspaceDeleted?.(msg)
        status('workspace-deleted')
        try {
          ws.close()
        } catch {
          // ignore
        }
        return
      }
      if (msg.type === 'error') {
        // e.g. not a member after delete — stop reconnect thrash
        if (
          String(msg.message || '')
            .toLowerCase()
            .includes('not a workspace member')
        ) {
          destroyed = true
          handlers.onWorkspaceDeleted?.(msg)
          status('error')
          try {
            ws.close()
          } catch {
            // ignore
          }
        }
      }
    }

    ws.onclose = () => {
      joined = false
      status('closed')
      if (!destroyed) scheduleReconnect()
    }

    ws.onerror = () => {
      status('error')
      try {
        ws.close()
      } catch {
        // ignore
      }
    }
  }

  const scheduleReconnect = () => {
    if (destroyed || reconnectTimer) return
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 2000)
  }

  connect()

  return {
    clientId,
    user: userMeta,
    isOpen: () => !!ws && ws.readyState === WebSocket.OPEN && joined,
    sendYjsUpdate(updateB64) {
      return send({
        type: 'yjs-update',
        workspaceId,
        key,
        update: updateB64,
        clientId
      })
    },
    sendAwareness(cursor) {
      return send({
        type: 'awareness',
        workspaceId,
        key,
        clientId,
        user: userMeta,
        cursor: cursor ?? null
      })
    },
    destroy() {
      destroyed = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      try {
        send({ type: 'leave', workspaceId, key, clientId })
        ws?.close()
      } catch {
        // ignore
      }
      ws = null
    }
  }
}
