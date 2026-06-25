import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react"

// For local testing. Change to your Render URL when pushing to Vercel!
const socket = io('http://localhost:3001')

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['bold', 'italic', 'underline'],
  [{ color: [] }, { background: [] }],
  ['clean'],
]

const SAVE_INTERVAL_MS = 2000

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

  useEffect(() => {
    if (!joined || !wrapperRef.current || !quillLoaded) return;
    if (wrapperRef.current.innerHTML !== "") return;

    const editor = document.createElement('div')
    wrapperRef.current.append(editor)
    
    const quill = new window.Quill(editor, {
      theme: 'snow',
      modules: { toolbar: TOOLBAR_OPTIONS },
    })
    
    quill.disable()
    quill.setText("Loading document...")
    quillRef.current = quill
  }, [joined, quillLoaded])

  useEffect(() => {
    if (!joined || !quillRef.current) return;
    const quill = quillRef.current;

    socket.once('load-document', (documentData) => {
      quill.setContents(documentData)
      quill.enable() 
    })

    const receiveHandler = (delta) => {
      quill.updateContents(delta)
    }
    socket.on('receive-changes', receiveHandler)

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source === 'user') {
        socket.emit('send-changes', { roomId, text: delta })
      }
    }
    quill.on('text-change', textChangeHandler)

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

  return (
    <>
      <SignedOut>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fbfd', fontFamily: 'sans-serif' }}>
          <h1>Welcome to Collab Docs 🚀</h1>
          <p style={{ marginBottom: '20px', color: '#555' }}>Please sign in to access your secure workspaces.</p>
          <div style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <SignInButton mode="modal" />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!joined ? (
          <div style={{ padding: '50px', fontFamily: 'sans-serif', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '20px' }}>
              <UserButton />
            </div>
            <h2>Enter Workspace Room ID</h2>
            <input 
              type="text" 
              value={roomId} 
              onChange={(e) => setRoomId(e.target.value)}
              style={{ padding: '10px', fontSize: '16px', marginRight: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <button onClick={handleJoinRoom} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '4px', border: 'none', backgroundColor: '#0070f3', color: 'white' }}>
              Join Room
            </button>
          </div>
        ) : (
          <div style={{ backgroundColor: '#f9fbfd', minHeight: '100vh', padding: '20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1>Collab Docs</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <span style={{ backgroundColor: '#e2e8f0', padding: '5px 15px', borderRadius: '20px' }}>
                    Room: <strong>{roomId}</strong>
                  </span>
                  <UserButton />
                </div>
              </div>
              
              <div 
                className="container" 
                ref={wrapperRef} 
                style={{ backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: '600px' }}
              ></div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  )
}