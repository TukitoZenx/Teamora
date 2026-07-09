/**
 * localCollabChannel
 * ===================
 *
 * Documents, Whiteboard, Spreadsheet, Slides, Files and Meetings were all
 * originally built against a Socket.IO room server (`roomId` + `socket.emit`/
 * `socket.on`). That server was removed when the backend was rewritten around
 * sessions + a proper `Workspace` model, but the components were never
 * reconnected to anything - see PROJECT_IMPROVEMENT_PLAN.md, Stage 6.
 *
 * This module provides a drop-in, dependency-free replacement for that socket
 * that works entirely in the browser:
 *  - `localStorage` gives every event a "last known value" that persists
 *    across reloads.
 *  - `BroadcastChannel` (a standard Web API, no dependency needed) relays
 *    every event to other tabs/windows viewing the same workspace feature
 *    live, including real WebRTC signaling for Meetings between tabs.
 *
 * The emit/on/off surface intentionally matches a real `socket.io-client`
 * instance closely enough that swapping this out for a real socket later
 * (once a realtime backend exists) should not require changes to the large
 * feature components themselves - only to the small `*Section` containers
 * that construct this channel.
 *
 * Event contract: the exact event *names* and payload shapes below were
 * recovered from the project's original Socket.IO server (see
 * `git show HEAD:server.js`, since removed) so this mirrors real
 * client -> server -> other clients relay semantics 1:1, including which
 * events broadcast to the room and which are targeted at one peer.
 */

const RELAY_MAP = {
  'draw-line': {
    receiveEvent: 'receive-draw-line',
    persist: false,
    transform: (value) => {
      const rest = { ...value }
      delete rest.roomId
      return rest
    }
  },
  'update-whiteboard-elements': {
    receiveEvent: 'receive-whiteboard-elements',
    persist: true,
    transform: ({ elements }) => elements
  },
  'file-content-update': {
    receiveEvent: 'receive-file-content-update',
    persist: true,
    transform: ({ fileId, content }) => ({ fileId, content })
  },
  'update-slides-list': {
    receiveEvent: 'receive-slides-list',
    persist: true,
    transform: ({ slides }) => slides
  },
  'change-slide': {
    receiveEvent: 'receive-slide-change',
    persist: false,
    transform: ({ slideIndex }) => ({ slideIndex })
  },
  // Not part of the recovered legacy protocol (the old server persisted Quill
  // Deltas via a separate 'save-document'/'send-changes' pair intended for
  // character-by-character sync, which needs real operational-transform
  // conflict resolution to do safely across multiple live editors - out of
  // scope for a local-only channel). This is a deliberately simpler
  // "debounced last-write-wins" sync of the full editor HTML, which is safe
  // and sufficient for same-tab persistence and cross-tab mirroring.
  'doc-content-sync': {
    receiveEvent: 'receive-doc-content-sync',
    persist: true,
    transform: ({ html }) => html
  },
  'update-document-comments': {
    receiveEvent: 'receive-document-comments',
    persist: true,
    transform: ({ comments }) => comments
  },
  'update-document-versions': {
    receiveEvent: 'receive-document-versions',
    persist: true,
    transform: ({ versions }) => versions
  },
  'update-files': {
    receiveEvent: 'receive-files',
    persist: true,
    transform: ({ files }) => files
  },
  // Single-cell deltas. Persistence of the *whole* grid is handled by
  // SpreadsheetSection itself (a snapshot keyed separately), since replaying
  // an unbounded history of individual cell deltas is not a viable hydration
  // strategy - only the latest full grid needs to survive a reload.
  'update-spreadsheet': {
    receiveEvent: 'receive-spreadsheet',
    persist: false,
    transform: ({ row, col, value }) => ({ row, col, value })
  },
  'update-room-settings': {
    receiveEvent: 'receive-room-settings',
    persist: true,
    transform: ({ settings }) => settings
  },
  'meeting-join': {
    receiveEvent: 'receive-meeting-join',
    persist: false,
    transform: ({ participant }) => participant
  },
  'meeting-leave': {
    receiveEvent: 'receive-meeting-leave',
    persist: false,
    transform: ({ socketId }) => socketId
  },
  'meeting-state-change': {
    receiveEvent: 'receive-meeting-state-change',
    persist: false,
    transform: ({ state }, senderId) => ({ socketId: senderId, state })
  },
  'meeting-signal': {
    receiveEvent: 'receive-meeting-signal',
    persist: false,
    targeted: true,
    getTargetId: ({ targetSocketId }) => targetSocketId,
    transform: ({ signal }, senderId) => ({ senderSocketId: senderId, signal })
  },
  // Meeting room chat — legacy emit name was `send-message`; deliver as a
  // room broadcast so other tabs mirror the chat transcript.
  'send-message': {
    receiveEvent: 'receive-message',
    persist: false,
    transform: (value, senderId) => ({
      ...value,
      senderSocketId: senderId
    })
  },
  // Host election for local multi-tab meetings (first joiner wins).
  'meeting-claim-host': {
    receiveEvent: 'receive-meeting-host',
    persist: true,
    transform: ({ hostSocketId, hostName }) => ({ hostSocketId, hostName })
  }
}

const DEFAULT_RULE = { receiveEvent: null, persist: true, transform: (value) => value }

const generateId = () => `local-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`

/**
 * Creates a local, per-browser "room" channel scoped to one workspace +
 * feature (e.g. workspace 123's whiteboard). Multiple components/tabs that
 * create a channel with the same `workspaceId`/`feature` pair transparently
 * share state.
 */
export function createLocalCollabChannel(workspaceId, feature) {
  const channelName = `teamora:collab:${workspaceId || 'unknown'}:${feature}`
  const listeners = new Map()
  const id = generateId()

  let bc = null
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(channelName)
    }
  } catch {
    bc = null
  }

  const storageKeyFor = (event) => `${channelName}::${event}`

  const readStored = (event) => {
    try {
      const raw = window.localStorage.getItem(storageKeyFor(event))
      return raw === null ? undefined : JSON.parse(raw)
    } catch {
      return undefined
    }
  }

  const writeStored = (event, value) => {
    try {
      if (value === undefined) {
        window.localStorage.removeItem(storageKeyFor(event))
      } else {
        window.localStorage.setItem(storageKeyFor(event), JSON.stringify(value))
      }
    } catch {
      // Persistence is best-effort (e.g. private browsing / storage full);
      // the in-memory channel still works for the current tab session.
    }
  }

  const deliver = (event, value) => {
    listeners.get(event)?.forEach((handler) => {
      try {
        handler(value)
      } catch (error) {
        console.error(`[localCollabChannel:${feature}] listener for "${event}" threw`, error)
      }
    })
  }

  if (bc) {
    bc.onmessage = (message) => {
      const { event, value, targetId } = message.data || {}
      if (!event) return
      if (targetId && targetId !== id) return
      deliver(event, value)
    }
  }

  const broadcast = (event, value, targetId) => {
    try {
      bc?.postMessage({ event, value, targetId })
    } catch {
      // Structured-clone failures (e.g. non-serializable payloads) shouldn't
      // break the local tab experience.
    }
  }

  return {
    id,
    workspaceId,
    feature,

    /** Mirrors `socket.emit(event, payload)`. */
    emit(event, value) {
      // `clear-board` is a special case inherited from the original protocol:
      // its payload is the bare roomId (not an object), and clearing the
      // board must both (a) notify already-open tabs to wipe their canvas
      // immediately and (b) reset the persisted element list so a page
      // reloaded later also starts blank.
      if (event === 'clear-board') {
        writeStored('receive-whiteboard-elements', [])
        deliver('receive-whiteboard-elements', [])
        broadcast('receive-whiteboard-elements', [])
        deliver('receive-clear-board', undefined)
        broadcast('receive-clear-board', undefined)
        return
      }

      const rule = RELAY_MAP[event] || { ...DEFAULT_RULE, receiveEvent: event }
      const receiveEvent = rule.receiveEvent
      if (!receiveEvent) return

      const payload = rule.transform ? rule.transform(value, id) : value

      if (rule.persist) {
        writeStored(receiveEvent, payload)
      }

      if (rule.targeted) {
        const targetId = rule.getTargetId ? rule.getTargetId(value) : undefined
        broadcast(receiveEvent, payload, targetId)
        return
      }

      // Broadcast-style events mirror `socket.to(room).emit(...)`, which
      // excludes the sender. Every one of these components already applies
      // its own change to local state before calling emit, so no self-echo
      // is needed here - except for "parent-owned" containers (Documents
      // comments/versions, Spreadsheet settings, Files list) that have no
      // internal listener of their own and rely on the *tab-local* delivery
      // below to update their state. Delivering locally is a safe no-op for
      // the self-updating components (same value applied twice) and required
      // for the parent-owned ones, so we always deliver locally too.
      deliver(receiveEvent, payload)
      broadcast(receiveEvent, payload)
    },

    /** Mirrors `socket.on(event, handler)`, replaying the last known value immediately. */
    on(event, handler) {
      if (!listeners.has(event)) listeners.set(event, new Set())
      listeners.get(event).add(handler)

      const stored = readStored(event)
      if (stored !== undefined) {
        handler(stored)
      }
    },

    /** Mirrors `socket.off(event, handler)`. Omit `handler` to remove all listeners for `event`. */
    off(event, handler) {
      if (!handler) {
        listeners.delete(event)
        return
      }
      listeners.get(event)?.delete(handler)
    },

    /** Not part of the socket.io surface, but callers should call this on unmount. */
    destroy() {
      bc?.close()
      listeners.clear()
    }
  }
}
