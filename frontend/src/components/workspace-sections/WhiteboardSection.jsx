import { useRef, useState } from 'react'
import Whiteboard from '../Whiteboard'
import useLocalCollabChannel from '../../hooks/useLocalCollabChannel'

/**
 * Whiteboard.jsx manages its own `elements` state internally, hydrating and
 * staying in sync purely through the socket's `receive-*` events, so this
 * container only needs to own the small bits of UI state (tool/color/size)
 * and hand it a channel - no local mirroring of `elements` is required here.
 */
export default function WhiteboardSection({ workspaceId, userName, activeFile, onDirtyChange }) {
  const canvasRef = useRef(null)
  const channel = useLocalCollabChannel(workspaceId, `whiteboard:${activeFile?.id || 'default'}`)

  const [myColor, setMyColor] = useState('#000000')
  const [whiteboardTool, setWhiteboardTool] = useState('pen')
  const [whiteboardSize, setWhiteboardSize] = useState(4)

  return (
    <Whiteboard
      canvasRef={canvasRef}
      myColor={myColor}
      setMyColor={setMyColor}
      whiteboardTool={whiteboardTool}
      setWhiteboardTool={setWhiteboardTool}
      whiteboardSize={whiteboardSize}
      setWhiteboardSize={setWhiteboardSize}
      whiteboardCursors={{}}
      socket={channel}
      roomId={workspaceId}
      userName={userName}
      onDirtyChange={onDirtyChange}
    />
  )
}
