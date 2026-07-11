import Meetings from '../Meetings'
import useMeetingSignaling from '../../hooks/useMeetingSignaling'

/**
 * Meetings section — uses shared hybrid signaling (BroadcastChannel + WebSocket).
 */
export default function MeetingsSection({ workspaceId, userName }) {
  const socket = useMeetingSignaling(workspaceId, userName)

  if (!socket?.id) {
    return (
      <div className="flex h-full min-h-[200px] flex-1 items-center justify-center rounded-card border border-border bg-card text-sm text-muted">
        Connecting meeting channel…
      </div>
    )
  }

  return <Meetings socket={socket} roomId={workspaceId} userName={userName || 'User'} />
}
