const STORAGE_KEY = 'teamora-notifications'

export const DEFAULT_NOTIFICATION_PREFERENCES = {
  emailNotifications: true,
  workspaceInvitations: true,
  meetingReminders: true,
  documentActivity: true,
  mentionNotifications: true
}

export const readNotificationPreferences = () => {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { ...DEFAULT_NOTIFICATION_PREFERENCES }
    return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) }
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES }
  }
}

/**
 * Map product notification types → preference toggles.
 * Unknown types default to visible (fail open for safety-critical items).
 */
export const isNotificationTypeEnabled = (type, preferences = readNotificationPreferences()) => {
  if (!type) return true

  if (type === 'join_request' || type === 'join_request_accepted' || type === 'join_request_declined') {
    return preferences.workspaceInvitations !== false
  }

  if (type === 'workspace_joined' || type === 'workspace_left' || type === 'workspace_event') {
    return preferences.workspaceInvitations !== false
  }

  if (type === 'meeting_reminder' || type === 'meeting') {
    return preferences.meetingReminders !== false
  }

  if (type === 'document_activity' || type === 'document') {
    return preferences.documentActivity !== false
  }

  if (type === 'mention') {
    return preferences.mentionNotifications !== false
  }

  return true
}

export const canShowBrowserNotification = (type) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  return isNotificationTypeEnabled(type)
}
