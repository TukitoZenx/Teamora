import { useEffect, useMemo } from 'react'
import Meetings from '../Meetings'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'
import { createMeetingSocket } from '../../services/meetingSocket'

/**
 * Hybrid signaling: same-browser BroadcastChannel + WebSocket room fanout
 * so multiple devices can join the same workspace meeting.
 */
export default function MeetingsSection({ workspaceId, userName }) {
  const localChannel = useLocalCollabChannel(workspaceId, 'meetings')

  const socket = useMemo(() => {
    if (!workspaceId) return localChannel
    return createMeetingSocket(localChannel, { workspaceId, userName })
  }, [workspaceId, userName, localChannel])

  useEffect(() => {
    return () => {
      socket?.destroy?.()
    }
  }, [socket])

  return <Meetings socket={socket} roomId={workspaceId} userName={userName} />
}
