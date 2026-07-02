import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, Check, CheckCheck, Eye, UserPlus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'

const NOTIFICATIONS_CACHE_KEY = 'teamora-notifications-cache'

const readNotificationCache = () => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATIONS_CACHE_KEY) || '[]')
  } catch {
    return []
  }
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
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState(() => readNotificationCache())
  const [busyId, setBusyId] = useState(null)
  const seenDecisionIds = useRef(new Set())

  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications])

  const loadNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/workspaces/notifications')
      const nextNotifications = data.notifications || []
      nextNotifications.forEach((item) => {
        if (item.read || seenDecisionIds.current.has(item._id)) return

        if (item.type === 'join_request_accepted') {
          seenDecisionIds.current.add(item._id)
          window.dispatchEvent(new Event('teamora-workspaces-refresh'))
          toast.success(item.message || 'Workspace access accepted')
        }

        if (item.type === 'join_request_declined') {
          seenDecisionIds.current.add(item._id)
          toast.error(item.message || 'Workspace access declined')
        }
      })
      setNotifications(nextNotifications)
      localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(nextNotifications))
    } catch {
      setNotifications([])
      localStorage.removeItem(NOTIFICATIONS_CACHE_KEY)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) loadNotifications()
    })
    const timer = window.setInterval(loadNotifications, 5000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [loadNotifications])

  const markAsRead = async (id) => {
    setNotifications((current) => {
      const nextNotifications = current.map((item) => (item._id === id ? { ...item, read: true } : item))
      localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(nextNotifications))
      return nextNotifications
    })
    try {
      await api.patch(`/api/v1/workspaces/notifications/${id}/read`)
    } catch {
      loadNotifications()
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter((item) => !item.read)
    setNotifications((current) => {
      const nextNotifications = current.map((item) => ({ ...item, read: true }))
      localStorage.setItem(NOTIFICATIONS_CACHE_KEY, JSON.stringify(nextNotifications))
      return nextNotifications
    })
    await Promise.allSettled(unread.map((item) => api.patch(`/api/v1/workspaces/notifications/${item._id}/read`)))
  }

  const resolveRequest = async (item, action) => {
    setBusyId(item._id)
    try {
      await api.post(`/api/v1/workspaces/${item.workspaceId}/join-requests/${item.requestId}/${action}`)
      await markAsRead(item._id)
      await loadNotifications()
      window.dispatchEvent(new Event('teamora-workspaces-refresh'))
      toast.success(action === 'accept' ? 'Request accepted' : 'Request declined')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-[#6B7280] transition duration-[180ms] ease-out hover:bg-[#F3F4F6] hover:text-[#7C3AED]"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] rounded-[20px] border border-[#E5E7EB] bg-white p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Notifications</p>
              <p className="text-xs text-[#6B7280]">{unreadCount} unread</p>
            </div>
            <button type="button" onClick={markAllAsRead} className="text-xs font-semibold text-[#7C3AED]">
              Mark all as read
            </button>
          </div>

          <div className="max-h-[28rem] space-y-2 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#E5E7EB] p-4 text-center text-sm text-[#6B7280]">
                No notifications yet
              </div>
            ) : (
              notifications.map((item) => {
                const isJoinRequest = item.type === 'join_request'
                const isPending = item.requestStatus === 'pending'

                return (
                  <div key={item._id} className={`rounded-[14px] border p-3 ${!item.read ? 'border-[#DDD6FE] bg-[#F8F5FF]' : 'border-[#E5E7EB] bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#F3F4F6] text-[#7C3AED]">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold text-[#111827]">{isJoinRequest ? 'Join Request' : 'Workspace Access'}</p>
                          {!item.read && <span className="h-2.5 w-2.5 rounded-full bg-[#7C3AED]" />}
                        </div>
                        <p className="mt-1 text-sm text-[#6B7280]">
                          {isJoinRequest
                            ? `${item.requesterName} requested access to ${item.workspaceName}`
                            : item.message}
                        </p>
                        <p className="mt-1 text-xs text-[#9CA3AF]">{formatTime(item.createdAt)}</p>

                        {isJoinRequest && isPending ? (
                          <div className="mt-3 flex gap-2">
                            <button
                              type="button"
                              disabled={busyId === item._id}
                              onClick={() => resolveRequest(item, 'accept')}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[12px] bg-[#7C3AED] px-3 text-xs font-semibold text-white transition hover:bg-[#6D28D9] disabled:opacity-60"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={busyId === item._id}
                              onClick={() => resolveRequest(item, 'decline')}
                              className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[12px] border border-[#E5E7EB] px-3 text-xs font-semibold text-[#374151] transition hover:bg-[#F3F4F6] disabled:opacity-60"
                            >
                              <X className="h-3.5 w-3.5" />
                              Decline
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => markAsRead(item._id)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#7C3AED]">
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <button type="button" onClick={loadNotifications} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[14px] border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#374151]">
            <Eye className="h-4 w-4" />
            Refresh
          </button>
        </div>
      )}
    </div>
  )
}
