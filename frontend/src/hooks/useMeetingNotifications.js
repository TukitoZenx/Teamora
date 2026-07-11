import { useEffect } from 'react'
import useMeetingSignaling from './useMeetingSignaling'
import { addWorkspaceNotification, dismissMeetingNotifications } from '../components/utils/notifications'

/**
 * Always-on meeting start/end notifications (shares signaling socket with Meetings UI).
 */
export default function useMeetingNotifications(workspaceId, currentUserName) {
  const socket = useMeetingSignaling(workspaceId, currentUserName || 'Member')

  useEffect(() => {
    if (!workspaceId || !socket?.on) return undefined

    const onStarted = (payload) => {
      if (!payload) return
      if (payload.organizer && payload.organizer === currentUserName) return
      if (payload.organizerId && payload.organizerId === socket.id) return

      addWorkspaceNotification({
        type: 'meeting_started',
        message: `${payload.organizer || 'A teammate'} started a meeting`,
        workspaceId: payload.workspaceId || workspaceId,
        workspaceName: payload.title || 'Teamora Call',
        action: { type: 'join_meeting', workspaceId: payload.workspaceId || workspaceId },
        meta: {
          meetingId: payload.meetingId || `meet-${workspaceId}`,
          organizer: payload.organizer,
          title: payload.title || 'Teamora Call',
          startedAt: payload.startedAt
        },
        dedupeKey: `meeting-started:${payload.workspaceId || workspaceId}`
      })
    }

    const onEnded = (payload) => {
      dismissMeetingNotifications(payload?.workspaceId || workspaceId)
    }

    socket.on('receive-meeting-started', onStarted)
    socket.on('receive-meeting-ended', onEnded)

    return () => {
      socket.off?.('receive-meeting-started', onStarted)
      socket.off?.('receive-meeting-ended', onEnded)
    }
  }, [workspaceId, currentUserName, socket])
}
