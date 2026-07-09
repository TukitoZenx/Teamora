import { useEffect, useState } from 'react'
import Files from '../Files'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

/**
 * Files.jsx calls `socket.emit('update-files', ...)` directly on every
 * mutation and expects the parent to own `filesList` - it has no internal
 * listener of its own, so this container is the one that stays in sync.
 */
export default function SharedFilesSection({ workspaceId, userName }) {
  const channel = useLocalCollabChannel(workspaceId, 'files')
  const [filesList, setFilesList] = useState([])

  useEffect(() => {
    channel.on('receive-files', setFilesList)
    return () => channel.off('receive-files', setFilesList)
  }, [channel])

  return (
    <Files filesList={filesList} socket={channel} roomId={workspaceId} userName={userName} currentUserRole="editor" />
  )
}
