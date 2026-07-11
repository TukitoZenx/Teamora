export const LOCAL_NOTIFICATIONS_CACHE_KEY = 'teamora-local-notifications-cache'
export const NOTIFICATIONS_CHANGED_EVENT = 'teamora-notifications-changed'

export const readLocalNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

/**
 * Persist local-only notifications.
 * @param {Array} notifications
 * @param {{ silent?: boolean }} [options]
 */
export const writeLocalNotifications = (notifications, options = {}) => {
  const next = Array.isArray(notifications) ? notifications : []
  const serialized = JSON.stringify(next)

  let previous = '[]'
  try {
    previous = localStorage.getItem(LOCAL_NOTIFICATIONS_CACHE_KEY) || '[]'
  } catch {
    // Treat unreadable storage as empty for comparison.
  }

  if (serialized === previous) return

  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_CACHE_KEY, serialized)
  } catch {
    // Storage may be full / blocked
  }

  if (!options.silent) {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
  }
}

/**
 * @param {object} opts
 * @param {string} opts.type
 * @param {string} opts.message
 * @param {string} [opts.workspaceId]
 * @param {string} [opts.workspaceName]
 * @param {{ type: string, workspaceId?: string }} [opts.action]
 * @param {object} [opts.meta]
 * @param {string} [opts.dedupeKey] - if set, replace existing with same key
 */
export const addWorkspaceNotification = ({
  type = 'workspace_event',
  message,
  workspaceId,
  workspaceName,
  action,
  meta,
  dedupeKey
}) => {
  if (!message) return null

  const notification = {
    _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    workspaceId,
    workspaceName,
    action: action || null,
    meta: meta || null,
    dedupeKey: dedupeKey || null,
    read: false,
    local: true,
    createdAt: new Date().toISOString()
  }

  let current = readLocalNotifications()
  if (dedupeKey) {
    current = current.filter((n) => n.dedupeKey !== dedupeKey)
  }
  // Avoid spam: same type+workspace+message within 30s
  const recentDupe = current.find(
    (n) =>
      n.type === type &&
      n.workspaceId === workspaceId &&
      n.message === message &&
      Date.now() - new Date(n.createdAt).getTime() < 30000
  )
  if (recentDupe && !dedupeKey) return recentDupe

  const nextNotifications = [notification, ...current].slice(0, 100)
  writeLocalNotifications(nextNotifications)
  return notification
}

/** Remove active meeting notifications for a workspace (on end / dismiss). */
export const dismissMeetingNotifications = (workspaceId) => {
  if (!workspaceId) return
  const next = readLocalNotifications().filter(
    (n) =>
      !(
        n.workspaceId === workspaceId &&
        (n.type === 'meeting_started' || n.dedupeKey === `meeting-started:${workspaceId}`)
      )
  )
  writeLocalNotifications(next)
}
