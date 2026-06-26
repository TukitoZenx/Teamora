import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react"

// ⚠️ CHANGE TO YOUR RENDER URL FOR PRODUCTION!
const socket = io('https://collab-workspace-cn0m.onrender.com')

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
  const { user } = useUser();
  const [roomId, setRoomId] = useState('')
  const [joined, setJoined] = useState(false)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const [recentRooms, setRecentRooms] = useState([])
  
  // Chat States
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const messagesEndRef = useRef(null) // <-- For Chat Auto-scroll

  const [activeUsers, setActiveUsers] = useState([]) // <-- NEW: State for Active User Avatars

  const [myColor] = useState('#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'))
  const wrapperRef = useRef(null)
  const quillRef = useRef(null)

  // Load Recent Rooms on startup
  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    setRecentRooms(savedRooms);
  }, []);

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.fullName) return user.fullName;
    if (user.firstName) return user.firstName;
    if (user.primaryEmailAddress) return user.primaryEmailAddress.emailAddress.split('@')[0];
    return 'Guest';
  };

  // 1. Load Quill scripts + Cursors
  useEffect(() => {
    const link = document.createElement('link')
    link.href = 'https://cdn.quilljs.com/1.3.6/quill.snow.css'
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    const script = document.createElement('script')
    script.src = 'https://cdn.quilljs.com/1.3.6/quill.js'
    script.onload = () => {
      const cursorScript = document.createElement('script')
      cursorScript.id = 'quill-cursors-script'
      cursorScript.src = 'https://cdn.jsdelivr.net/npm/quill-cursors@3.1.0/dist/quill-cursors.min.js'
      cursorScript.onload = () => {
        window.Quill.register('modules/cursors', window.QuillCursors)
        setQuillLoaded(true)
      }
      document.head.appendChild(cursorScript)
    }
    document.head.appendChild(script)

    return () => {
      if (document.head.contains(link)) document.head.removeChild(link)
      if (document.head.contains(script)) document.head.removeChild(script)
      const cScript = document.getElementById('quill-cursors-script')
      if (cScript && document.head.contains(cScript)) document.head.removeChild(cScript)
    }
  }, [])

  // 2. Initialize Editor
  useEffect(() => {
    if (!joined || !wrapperRef.current || !quillLoaded) return;
    if (wrapperRef.current.innerHTML !== "") return;

    const editor = document.createElement('div')
    wrapperRef.current.append(editor)
    
    const quill = new window.Quill(editor, {
      theme: 'snow',
      modules: { 
        toolbar: TOOLBAR_OPTIONS,
        cursors: { transformOnTextChange: true } 
      },
    })
    
    quillRef.current = quill
  }, [joined, quillLoaded])

  // 3. Socket Logic
  useEffect(() => {
    if (!joined || !quillRef.current) return;
    const quill = quillRef.current;
    const cursorsModule = quill.getModule('cursors');

    // NEW: Listen for updates to the active users list
    socket.on('active-users', (users) => {
      setActiveUsers(users);
    });

    socket.once('load-document', (documentData) => {
      if (documentData) quill.setContents(documentData);
      quill.enable();
    });

    const receiveHandler = (delta) => quill.updateContents(delta);
    socket.on('receive-changes', receiveHandler);

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source === 'user') socket.emit('send-changes', { roomId, text: delta });
    };
    quill.on('text-change', textChangeHandler);

    const selectionChangeHandler = (range, oldRange, source) => {
      if (source === 'user' && user) {
        socket.emit('cursor-move', { roomId, range, user: getDisplayName(), color: myColor });
      }
    };
    quill.on('selection-change', selectionChangeHandler);

    const receiveCursorHandler = ({ range, user: cursorUser, color }) => {
      if (range) {
        cursorsModule.createCursor(cursorUser, cursorUser, color);
        cursorsModule.moveCursor(cursorUser, range);
      } else {
        cursorsModule.removeCursor(cursorUser);
      }
    };
    socket.on('receive-cursor', receiveCursorHandler);

    const messageHandler = (data) => setMessages((prev) => [...prev, data]);
    socket.on('receive-message', messageHandler);

    const saveInterval = setInterval(() => {
      socket.emit('save-document', { roomId, data: quill.getContents() });
    }, SAVE_INTERVAL_MS);

    return () => {
      socket.off('receive-changes', receiveHandler);
      socket.off('receive-message', messageHandler);
      socket.off('receive-cursor', receiveCursorHandler);
      socket.off('active-users'); // <-- NEW: Cleanup active users listener
      quill.off('text-change', textChangeHandler);
      quill.off('selection-change', selectionChangeHandler);
      clearInterval(saveInterval);
    };
  }, [joined, roomId]);

  // --- Auto-scroll Chat ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 4. Handlers
  const handleJoinRoom = (targetRoomId) => {
    const roomToJoin = targetRoomId || roomId;
    if (roomToJoin.trim() !== '') {
      // UPDATE: Send user details (including imageUrl) along with the room ID
      socket.emit('join-room', { 
        roomId: roomToJoin, 
        user: getDisplayName(), 
        imageUrl: user?.imageUrl 
      });
      setRoomId(roomToJoin);
      setJoined(true);

      // Save to Recent Rooms
      const updatedRooms = [roomToJoin, ...recentRooms.filter(r => r !== roomToJoin)].slice(0, 5); // Keep last 5
      setRecentRooms(updatedRooms);
      localStorage.setItem('recentRooms', JSON.stringify(updatedRooms));
    }
  };

  const handleSendMessage = () => {
    if (chatInput.trim() === '') return;
    const messageData = { 
      roomId, 
      message: chatInput, 
      user: getDisplayName() 
    };
    socket.emit('send-message', messageData);
    setMessages((prev) => [...prev, { ...messageData, timestamp: new Date().toLocaleTimeString() }]);
    setChatInput('');
  };

  const downloadPDF = () => {
    const element = document.querySelector('.ql-editor');
    if (!element) return;
    const opt = { margin: 1, filename: `${roomId}-workspace.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    
    if (typeof window.html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => window.html2pdf().set(opt).from(element).save();
      document.head.appendChild(script);
    } else {
      window.html2pdf().set(opt).from(element).save();
    }
  };

  // --- UI RENDERING ---
  return (
    <>
      <SignedOut>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fbfd', fontFamily: 'sans-serif' }}>
          <h1>Welcome to Collab Suite 🚀</h1>
          <p style={{ marginBottom: '20px', color: '#555' }}>Please sign in to access your secure workspaces.</p>
          <div style={{ padding: '10px 20px', backgroundColor: '#0070f3', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            <SignInButton mode="modal" />
          </div>
        </div>
      </SignedOut>

      <SignedIn>
        {!joined ? (
          <div style={{ backgroundColor: '#f9fbfd', minHeight: '100vh', padding: '50px', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <h1>My Workspace Dashboard</h1>
                <UserButton />
              </div>

              {/* Create New Room Section */}
              <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', marginBottom: '30px' }}>
                <h2 style={{ marginTop: 0 }}>Join or Create a Document</h2>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder="e.g. team-meeting-notes"
                    value={roomId} 
                    onChange={(e) => setRoomId(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                    style={{ flex: 1, padding: '12px', fontSize: '16px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' }}
                  />
                  <button onClick={() => handleJoinRoom()} style={{ padding: '12px 25px', fontSize: '16px', cursor: 'pointer', borderRadius: '6px', border: 'none', backgroundColor: '#0070f3', color: 'white', fontWeight: 'bold' }}>
                    Open Room
                  </button>
                </div>
              </div>

              {/* Recent Rooms Section */}
              {recentRooms.length > 0 && (
                <div>
                  <h3 style={{ color: '#555' }}>Recent Documents</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    {recentRooms.map((room, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => handleJoinRoom(room)}
                        style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', cursor: 'pointer', border: '1px solid #eaeaea', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '15px' }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = '#0070f3'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = '#eaeaea'}
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                          📄
                        </div>
                        <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#333' }}>{room}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ backgroundColor: '#f9fbfd', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', maxWidth: '1200px', margin: '0 auto 20px auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={() => setJoined(false)} 
                  style={{ backgroundColor: 'transparent', border: '1px solid #ccc', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ← Back to Dashboard
                </button>
                <h2 style={{ margin: 0 }}>Collab Suite</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <button 
                  onClick={downloadPDF}
                  style={{ backgroundColor: '#10b981', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ↓ Export PDF
                </button>
                <span style={{ backgroundColor: '#e2e8f0', padding: '5px 15px', borderRadius: '20px' }}>
                  Room: <strong>{roomId}</strong>
                </span>
                <UserButton />
              </div>
            </div>

            {/* NEW: Active Users Presence Bar */}
            <div style={{ display: 'flex', alignItems: 'center', maxWidth: '1200px', margin: '0 auto 15px auto', padding: '10px 20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <span style={{ fontSize: '14px', color: '#555', marginRight: '15px', fontWeight: 'bold' }}>Live Now:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                {activeUsers.map((activeUser, idx) => (
                  <img 
                    key={idx}
                    src={activeUser.imageUrl || 'https://www.gravatar.com/avatar/?d=mp'} 
                    alt={activeUser.user} 
                    title={activeUser.user} // Shows their name when hovered!
                    style={{ width: '35px', height: '35px', borderRadius: '50%', border: '2px solid #10b981', objectFit: 'cover' }} 
                  />
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', maxWidth: '1200px', margin: '0 auto', height: '650px' }}>
              
              <div style={{ flex: 3, display: 'flex', flexDirection: 'column' }}>
                <div 
                  className="container" 
                  ref={wrapperRef} 
                  style={{ flex: 1, backgroundColor: 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}
                ></div>
              </div>

              <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ marginTop: 0, borderBottom: '1px solid #eee', paddingBottom: '10px' }}>Team Chat</h3>
                
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: '15px', paddingRight: '5px' }}>
                  {messages.map((m, i) => (
                    <div key={i} style={{ marginBottom: '10px', fontSize: '14px' }}>
                      <span style={{ fontWeight: 'bold', color: '#0070f3' }}>{m.user}</span>
                      <span style={{ color: '#888', fontSize: '11px', marginLeft: '8px' }}>{m.timestamp}</span>
                      <p style={{ margin: '2px 0 0 0', lineHeight: '1.4', wordBreak: 'break-word' }}>{m.message}</p>
                    </div>
                  ))}
                  {/* AUTO SCROLL ANCHOR */}
                  <div ref={messagesEndRef} /> 
                  
                  {messages.length === 0 && <p style={{ color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: '50px' }}>No messages yet. Say hi!</p>}
                </div>
                
                <div style={{ display: 'flex' }}>
                  <input 
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput} 
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    style={{ flex: 1, padding: '10px', borderRadius: '4px 0 0 4px', border: '1px solid #ccc', outline: 'none' }}
                  />
                  <button 
                    onClick={handleSendMessage}
                    style={{ padding: '10px 15px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '0 4px 4px 0', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </SignedIn>
    </>
  )
}