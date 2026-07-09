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
 * @param {{ silent?: boolean }} [options] - silent skips the change event (use when
 *   the writer is already reacting to that event to avoid infinite loops).
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

  // No-op when unchanged — prevents event thrash.
  if (serialized === previous) return

  try {
    localStorage.setItem(LOCAL_NOTIFICATIONS_CACHE_KEY, serialized)
  } catch {
    // Storage may be full / blocked; still try to notify listeners when not silent.
  }

  if (!options.silent) {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
  }
}

export const addWorkspaceNotification = ({ type = 'workspace_event', message, workspaceId, workspaceName }) => {
  if (!message) return null

  const notification = {
    _id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    workspaceId,
    workspaceName,
    read: false,
    local: true,
    createdAt: new Date().toISOString()
  }
  const nextNotifications = [notification, ...readLocalNotifications()]
  writeLocalNotifications(nextNotifications)
  return notification
}
