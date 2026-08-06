import * as Y from 'yjs'
import { getWorkspaceContent, putWorkspaceContent } from './workspaceContent'
import { connectCollabSocket } from './collabSocket'

/** Chunked base64 — avoids per-byte string concat on large Yjs updates. */
const toBase64 = (u8) => {
  const bytes = u8 instanceof Uint8Array ? u8 : new Uint8Array(u8)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

const fromBase64 = (b64) => {
  const binary = atob(b64)
  const len = binary.length
  const u8 = new Uint8Array(len)
  for (let i = 0; i < len; i += 1) u8[i] = binary.charCodeAt(i)
  return u8
}

/**
 * Yjs provider over REST content API + optional WebSocket fanout.
 * - Pushes local updates (debounced) to REST for durability
 * - Broadcasts same updates over WS for low latency when available
 * - Polls server as backup (much slower when WS connected; pauses when tab hidden)
 */
export function connectRestYjsProvider(
  ydoc,
  { workspaceId, key, pollMs = 3000, user, onAwareness, onPeerLeave, onWsStatus, onWorkspaceDeleted }
) {
  let destroyed = false
  let pending = []
  let flushTimer = null
  let pollTimer = null
  let pushing = false
  let lastPushedState = null
  let lastRemoteState = null
  let wsConnected = false
  let wsPending = []
  let wsFlushTimer = null
  let pullInFlight = false

  const handleWorkspaceDeleted = (msg) => {
    destroyed = true
    pending = []
    wsPending = []
    try {
      window.dispatchEvent(
        new CustomEvent('teamora-workspace-deleted', {
          detail: { workspaceId, message: msg?.message }
        })
      )
    } catch {
      // ignore
    }
    onWorkspaceDeleted?.(msg)
  }

  let blockedByPayload = false

  // Poll helpers must exist before connectCollabSocket: onStatus can fire
  // synchronously during connect() ('connecting' / 'unavailable').
  const currentPollMs = () => (wsConnected ? Math.max(pollMs, 15000) : pollMs)

  const pull = async () => {
    if (destroyed || !workspaceId || pullInFlight) return
    pullInFlight = true
    try {
      const content = await getWorkspaceContent(workspaceId, key)
      const remote = content?.data
      if (!remote || remote.format !== 'yjs-v1' || typeof remote.state !== 'string') return
      // Skip expensive apply when nothing changed.
      if (remote.state === lastPushedState || remote.state === lastRemoteState) return
      lastRemoteState = remote.state
      Y.applyUpdate(ydoc, fromBase64(remote.state), 'remote')
    } catch {
      // Offline — keep local.
    } finally {
      pullInFlight = false
    }
  }

  const pullIfVisible = () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return
    return pull()
  }

  const reschedulePoll = () => {
    if (destroyed) return
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = window.setInterval(pullIfVisible, currentPollMs())
  }

  const collab =
    workspaceId && key
      ? connectCollabSocket(
          { workspaceId, key, user },
          {
            onYjsUpdate: (b64) => {
              if (destroyed) return
              try {
                Y.applyUpdate(ydoc, fromBase64(b64), 'remote')
              } catch {
                // ignore malformed
              }
            },
            onAwareness: (msg) => onAwareness?.(msg),
            onPeerLeave: (clientId) => onPeerLeave?.(clientId),
            onWorkspaceDeleted: handleWorkspaceDeleted,
            onStatus: (status) => {
              if (status === 'workspace-deleted') return
              wsConnected = status === 'joined' || status === 'open'
              onWsStatus?.(status)
              reschedulePoll()
            }
          }
        )
      : null

  const flush = async () => {
    if (destroyed || pushing || pending.length === 0 || !workspaceId) return
    // Do not retry forever when server rejects oversize payloads (413).
    if (blockedByPayload) {
      pending = []
      return
    }
    pushing = true
    const batch = pending
    pending = []
    try {
      const merged = Y.mergeUpdates(batch)
      const updateB64 = toBase64(merged)
      // Low-latency fanout (best-effort).
      collab?.sendYjsUpdate?.(updateB64)
      await putWorkspaceContent(workspaceId, key, {
        format: 'yjs-v1',
        update: updateB64
      })
      lastPushedState = toBase64(Y.encodeStateAsUpdate(ydoc))
      lastRemoteState = lastPushedState
      blockedByPayload = false
    } catch (err) {
      const status = err?.status || err?.response?.status
      if (status === 404 || status === 403) {
        // Workspace deleted or access revoked — stop collab and notify the app shell.
        pending = []
        handleWorkspaceDeleted({ workspaceId, message: err?.message })
      } else if (status === 413) {
        // Payload too large — re-queuing would spam the console forever.
        blockedByPayload = true
        pending = []
        console.warn('[collab] Content save rejected (413 Payload Too Large). Compress images or remove large assets.')
      } else {
        // Transient / offline — re-queue.
        pending = batch.concat(pending)
      }
    } finally {
      pushing = false
      if (pending.length > 0 && !destroyed && !blockedByPayload) {
        flushTimer = window.setTimeout(flush, 500)
      }
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    // Slightly longer debounce when live WS is up — durability is secondary to typing latency.
    const delay = wsConnected ? 700 : 450
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      flush()
    }, delay)
  }

  const flushWs = () => {
    if (destroyed || wsPending.length === 0) return
    const batch = wsPending
    wsPending = []
    try {
      const merged = Y.mergeUpdates(batch)
      collab?.sendYjsUpdate?.(toBase64(merged))
    } catch {
      // ignore
    }
  }

  const scheduleWsFlush = () => {
    if (wsFlushTimer) return
    wsFlushTimer = window.setTimeout(() => {
      wsFlushTimer = null
      flushWs()
    }, 50) // Batch ultra-fast drawing updates
  }

  const onLocalUpdate = (update, origin) => {
    if (destroyed || origin === 'remote') return
    pending.push(update)
    wsPending.push(update)
    scheduleWsFlush()
    scheduleFlush()
  }

  ydoc.on('update', onLocalUpdate)

  pull()
  pollTimer = window.setInterval(pullIfVisible, currentPollMs())

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      reschedulePoll()
      pull()
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility)
  }

  return {
    destroy() {
      // Start one final durable save before marking the provider as destroyed.
      // Previously `destroyed` was set first, which made this `flush()` a
      // no-op and could lose the last debounced document edit on navigation.
      const finalFlush = flush()
      destroyed = true
      ydoc.off('update', onLocalUpdate)
      if (flushTimer) window.clearTimeout(flushTimer)
      if (wsFlushTimer) window.clearTimeout(wsFlushTimer)
      if (pollTimer) window.clearInterval(pollTimer)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
      collab?.destroy?.()
      return finalFlush
    },
    flush,
    pull,
    sendAwareness(cursor) {
      collab?.sendAwareness?.(cursor)
    },
    getClientId: () => collab?.clientId,
    isWsConnected: () => wsConnected
  }
}

/**
 * Import legacy HTML blob into an empty Y.Doc Quill type once.
 */
export function importLegacyHtmlToYdoc(ydoc, html) {
  if (!html || typeof html !== 'string') return
  const meta = ydoc.getMap('meta')
  if (!meta.get('legacyHtmlImported')) {
    meta.set('legacyHtml', html)
    meta.set('legacyHtmlImported', true)
  }
}
