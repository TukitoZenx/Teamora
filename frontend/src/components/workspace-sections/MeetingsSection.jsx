import Meetings from '../Meetings'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

/**
 * Meetings.jsx manages all of its own state (participants, WebRTC peer
 * connections, host controls) and only needs a socket-shaped channel plus a
 * few scalars. The WebRTC signaling it does over that channel works for real
 * between two browser tabs on the same machine (BroadcastChannel relays the
 * SDP offer/answer/ICE candidates); true cross-device calls need a real
 * signaling server - see PROJECT_IMPROVEMENT_PLAN.md future work.
 */
export default function MeetingsSection({ workspaceId, userName }) {
  const channel = useLocalCollabChannel(workspaceId, 'meetings')

  return <Meetings socket={channel} roomId={workspaceId} userName={userName} />
}
