import * as Y from 'yjs'
import { getWorkspaceContent, putWorkspaceContent } from './workspaceContent'
import { connectCollabSocket } from './collabSocket'

const toBase64 = (u8) => {
  let s = ''
  u8.forEach((b) => {
    s += String.fromCharCode(b)
  })
  return btoa(s)
}

const fromBase64 = (b64) => {
  const s = atob(b64)
  const u8 = new Uint8Array(s.length)
  for (let i = 0; i < s.length; i += 1) u8[i] = s.charCodeAt(i)
  return u8
}

/**
 * Yjs provider over REST content API + optional WebSocket fanout.
 * - Pushes local updates (debounced) to REST for durability
 * - Broadcasts same updates over WS for low latency when available
 * - Polls server as backup (slower when WS connected)
 */
export function connectRestYjsProvider(
  ydoc,
  { workspaceId, key, pollMs = 1200, user, onAwareness, onPeerLeave, onWsStatus, onWorkspaceDeleted }
) {
  let destroyed = false
  let pending = []
  let flushTimer = null
  let pollTimer = null
  let pushing = false
  let lastPushedState = null
  let wsConnected = false
  let wsPending = []
  let wsFlushTimer = null

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
              // Tighten / loosen poll when WS availability changes.
              if (pollTimer) {
                window.clearInterval(pollTimer)
                pollTimer = window.setInterval(pull, wsConnected ? Math.max(pollMs, 8000) : pollMs)
              }
            }
          }
        )
      : null

  let blockedByPayload = false

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
        flushTimer = window.setTimeout(flush, 400)
      }
    }
  }

  const scheduleFlush = () => {
    if (flushTimer) return
    flushTimer = window.setTimeout(() => {
      flushTimer = null
      flush()
    }, 350)
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

  const pull = async () => {
    if (destroyed || !workspaceId) return
    try {
      const content = await getWorkspaceContent(workspaceId, key)
      const remote = content?.data
      if (!remote || remote.format !== 'yjs-v1' || typeof remote.state !== 'string') return
      if (remote.state === lastPushedState) return
      Y.applyUpdate(ydoc, fromBase64(remote.state), 'remote')
    } catch {
      // Offline — keep local.
    }
  }

  pull()
  pollTimer = window.setInterval(pull, pollMs)

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
