export const LOCAL_NOTIFICATIONS_CACHE_KEY = 'teamora-local-notifications-cache'
export const NOTIFICATIONS_CHANGED_EVENT = 'teamora-notifications-changed'

export const readLocalNotifications = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_NOTIFICATIONS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

export const writeLocalNotifications = (notifications) => {
  localStorage.setItem(LOCAL_NOTIFICATIONS_CACHE_KEY, JSON.stringify(notifications))
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))
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
