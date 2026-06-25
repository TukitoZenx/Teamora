import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  ['clean'],
]

const SAVE_INTERVAL_MS = 2000 // Auto-save every 2 seconds

export default function App() {
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const wrapperRef = useRef(null)
  const quillRef = useRef(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cdn.quilljs.com/1.3.6/quill.js'
    script.onload = () => setQuillLoaded(true)
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link)
      if (document.head.contains(script)) document.head.removeChild(script)
    }
  }, [])

  // 1. Initialize Quill Editor
  useEffect(() => {
    if (!joined || !wrapperRef.current || !quillLoaded) return;
    if (wrapperRef.current.innerHTML !== "") return;

    const editor = document.createElement('div')
    wrapperRef.current.append(editor)
    
    const quill = new window.Quill(editor, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
    })
    
    // Disable editing UNTIL the database finishes loading the document
    quill.disable()
    quill.setText("Loading document...")
    
    quillRef.current = quill
  }, [joined, quillLoaded])

  // 2. Handle Real-Time Collaboration & Database Sync
  useEffect(() => {
    if (!joined || !quillRef.current) return;
    const quill = quillRef.current;

    // A. Load initial document from MongoDB
    socket.once('load-document', (documentData) => {
      quill.setContents(documentData)
      quill.enable() // Re-enable typing now that data is loaded!
    })

    // B. Receive changes from teammates
    const receiveHandler = (delta) => {
      quill.updateContents(delta)
    }
    socket.on('receive-changes', receiveHandler)

    // C. Send your changes to teammates
    const textChangeHandler = (delta, oldDelta, source) => {
      if (source === 'user') {
        socket.emit('send-changes', { roomId, text: delta })
      }
    }
    quill.on('text-change', textChangeHandler)

    // D. Auto-save Timer
    const saveInterval = setInterval(() => {
      socket.emit('save-document', { 
        roomId: roomId, 
        data: quill.getContents() 
      })
    }, SAVE_INTERVAL_MS)

    return () => {
      socket.off('receive-changes', receiveHandler)
      quill.off('text-change', textChangeHandler)
      clearInterval(saveInterval)
    }
  }, [joined, roomId])

  const handleJoinRoom = () => {
    if (roomId.trim() !== '') {
      socket.emit('join-room', roomId)
      setJoined(true)
    }
  }

  // --- UI RENDERING ---
  if (!joined) {
    return (
      <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
        <h2>Enter Workspace Room ID</h2>
        <input 
          type="text" 
          value={roomId} 
          onChange={(e) => setRoomId(e.target.value)}
          style={{ padding: '10px', fontSize: '16px', marginRight: '10px' }}
        />
        <button onClick={handleJoinRoom} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Join Room
        </button>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: '#f9fbfd', minHeight: '100vh', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Collab Docs</h1>
          <span style={{ backgroundColor: '#e2e8f0', padding: '5px 15px', borderRadius: '20px' }}>
            Room: <strong>{roomId}</strong>
          </span>
        </div>
        
        {/* The Quill Editor container */}
        <div 
          className="container" 
          ref={wrapperRef} 
          style={{ backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '600px' }}
        ></div>
      </div>
    </div>
  )
}