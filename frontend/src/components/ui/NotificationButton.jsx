import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, RefreshCw, UserPlus, Video, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import {
  dismissMeetingNotifications,
  NOTIFICATIONS_CHANGED_EVENT,
  readLocalNotifications,
  writeLocalNotifications
} from '../utils/notifications'
import { isNotificationTypeEnabled, readNotificationPreferences } from '../utils/notificationPreferences'

const NOTIFICATIONS_CACHE_KEY = 'teamora-notifications-cache'

const readNotificationCache = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
}

const writeNotificationCache = (items) => {
  try {
    localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(items))
  } catch {
    // Cache is best-effort.
  }
}

/** Keep only items the user still needs — pending joins or unread, and prefs-enabled. */
const keepVisibleNotifications = (items = []) => {
  const prefs = readNotificationPreferences()
  return items.filter((item) => {
    if (!item) return false
    if (!isNotificationTypeEnabled(item.type, prefs)) return false
    if (item.type === 'join_request' && item.requestStatus === 'pending') return true
    return !item.read
  })
}

const mergeNotificationLists = (localItems, remoteItems) => {
  const byId = new Map()
  ;[...localItems, ...remoteItems].forEach((item) => {
    if (item?._id) byId.set(String(item._id), item)
  })
  return keepVisibleNotifications(Array.from(byId.values())).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  )
}

const formatTime = (value) => {
  if (!value) return 'Just now'

  const then = new Date(value).getTime()
  const diff = Math.max(0, Date.now() - then)
  const minutes = Math.floor(diff / 60000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`

  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function NotificationButton() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => keepVisibleNotifications(readNotificationCache()))
  const [busyId, setBusyId] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const seenDecisionIds = useRef(new Set())
  const rootRef = useRef(null)
  const notificationsRef = useRef(notifications)

  useEffect(() => {
    notificationsRef.current = notifications
  }, [notifications])

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const applyNotifications = useCallback((next, { emitLocalEvent = true } = {}) => {
    const visible = keepVisibleNotifications(next)
    setNotifications(visible)
    writeNotificationCache(visible)

    // Only touch the local-notifications store for local items. Use silent when
    // we are responding to NOTIFICATIONS_CHANGED_EVENT so we never re-enter.
    const localOnly = visible.filter((item) => item.local)
    writeLocalNotifications(localOnly, { silent: !emitLocalEvent })
    return visible
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/workspaces/notifications')
      const nextNotifications = data.notifications || []

      nextNotifications.forEach((item) => {
        if (item.read || seenDecisionIds.current.has(item._id)) return

        if (item.type === 'join_request_accepted') {
          seenDecisionIds.current.add(item._id)
          window.dispatchEvent(new Event('teamora-workspaces-refresh'))
        }

        if (item.type === 'join_request_declined') {
          seenDecisionIds.current.add(item._id)
        }
      })

      const merged = mergeNotificationLists(readLocalNotifications(), nextNotifications)
      applyNotifications(merged)
    } catch {
      applyNotifications(readLocalNotifications())
    }
  }, [applyNotifications])

  const handleRefreshClick = async () => {
    setIsRefreshing(true)
    await loadNotifications()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) loadNotifications()
    })
    const timer = window.setInterval(loadNotifications, 5000)

    // External writers (addWorkspaceNotification) fire this. Never call
    // writeLocalNotifications with emit here — that caused the infinite loop.
    const syncLocalNotifications = () => {
      const current = notificationsRef.current
      const remoteNotifications = current.filter((item) => !item.local)
      const merged = mergeNotificationLists(readLocalNotifications(), remoteNotifications)
      applyNotifications(merged, { emitLocalEvent: false })
    }

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, syncLocalNotifications)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, syncLocalNotifications)
    }
  }, [loadNotifications, applyNotifications])

  useEffect(() => {
    if (!open) return undefined

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const dismissNotification = async (id) => {
    const target = notifications.find((item) => item._id === id)
    applyNotifications(notifications.filter((item) => item._id !== id))

    if (target?.local) return

    try {
      await api.patch(`/api/v1/workspaces/notifications/${id}/read`)
    } catch {
      loadNotifications()
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => !item.read)
    const pendingJoin = notifications.filter((item) => item.type === 'join_request' && item.requestStatus === 'pending')
    applyNotifications(pendingJoin)
    await Promise.allSettled(
      unread.filter((item) => !item.local).map((item) => api.patch(`/api/v1/workspaces/notifications/${item._id}/read`))
    )
  }

  const resolveRequest = async (item, action) => {
    setBusyId(item._id)
    try {
      await api.post(`/api/v1/workspaces/${item.workspaceId}/join-requests/${item.requestId}/${action}`, {})
      await dismissNotification(item._id)
      await loadNotifications()
      window.dispatchEvent(new Event('teamora-workspaces-refresh'))
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  const joinMeetingFromNotification = (item) => {
    const workspaceId = item.action?.workspaceId || item.workspaceId
    if (!workspaceId) {
      toast.error('Meeting workspace not found')
      return
    }
    setOpen(false)
    // Navigate into workspace meetings section
    sessionStorage.setItem('teamora-auto-join-meeting', workspaceId)
    navigate(`/workspace/${workspaceId}/meetings`)
    // Also dispatch in case we are already in the workspace and no mount happens
    window.dispatchEvent(new CustomEvent('teamora-open-meetings', { detail: { workspaceId } }))
    toast.success('Opening meeting…')
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition duration-normal ease-standard hover:bg-card-sunken hover:text-primary"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-primary" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-[22rem] rounded-card border border-border bg-card p-3 shadow-dropdown"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Notifications</p>
              <p className="text-xs text-muted">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" onClick={markAllAsRead} className="px-2 py-1 text-xs font-semibold text-primary">
                Clear all
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-card-sunken hover:text-text"
                aria-label="Close notifications"
                title="Close notifications"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="teamora-scroll max-h-[28rem] space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="rounded-button border border-dashed border-border p-4 text-center text-sm text-muted">
                No notifications yet
              </div>
            ) : (
              notifications.map((item) => {
                const isJoinRequest = item.type === 'join_request'
                const isMeeting = item.type === 'meeting_started' || item.action?.type === 'join_meeting'
                const isWorkspaceEvent = item.local || item.type !== 'join_request'
                const isPending = item.requestStatus === 'pending'
                const title = isJoinRequest
                  ? 'Join Request'
                  : isMeeting
                    ? item.meta?.title || 'Meeting started'
                    : 'Workspace Update'
                const body = isJoinRequest
                  ? `${item.requesterName} requested access to ${item.workspaceName}`
                  : isMeeting
                    ? `${item.meta?.organizer || 'Someone'} · ${item.message}`
                    : item.message

                return (
                  <div
                    key={item._id}
                    className={`rounded-button border p-3 ${!item.read ? 'border-primary-muted bg-primary-subtle' : 'border-border bg-card'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-card-sunken text-primary">
                        {isMeeting ? (
                          <Video className="h-4 w-4" />
                        ) : isWorkspaceEvent ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-text">{title}</p>
                          {!item.read && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                        </div>
                        <p className="mt-1 text-sm text-muted">{body}</p>
                        <p className="mt-1 text-xs text-muted">{formatTime(item.createdAt)}</p>

                        {isJoinRequest && isPending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === item._id}
                              onClick={() => resolveRequest(item, 'accept')}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-on-primary transition hover:bg-primary-hover disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item._id}
                              onClick={() => resolveRequest(item, 'decline')}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control border border-border px-3 text-xs font-semibold text-text-secondary transition hover:bg-card-sunken disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </button>
                          </div>
                        ) : isMeeting ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => joinMeetingFromNotification(item)}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-xs font-semibold text-on-primary transition hover:bg-primary-hover"
                            >
                              <Video className="h-3.5 w-3.5" />
                              Join Meeting
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                dismissMeetingNotifications(item.workspaceId)
                                dismissNotification(item._id)
                              }}
                              className="inline-flex h-9 items-center justify-center gap-1 rounded-control border border-border px-3 text-xs font-semibold text-text-secondary hover:bg-card-sunken"
                            >
                              Dismiss
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => dismissNotification(item._id)}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Dismiss
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <button
            type="button"
            onClick={handleRefreshClick}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-button border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-primary/10 hover:text-primary"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
