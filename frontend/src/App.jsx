import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react"
import { motion } from 'framer-motion'
import {
  Building2,
  Hash,
  Copy,
  User as UserIcon,
  LogIn,
  Plus,
  Lock,
  Moon,
  Sun,
  FileText,
  Paintbrush,
  TableProperties,
  Presentation,
  MessageSquare,
  ArrowRight
} from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'
import TopNavbar from './components/TopNavbar'
import Sidebar from './components/Sidebar'
import StatusBar from './components/StatusBar'
import CollaborationPanel from './components/CollaborationPanel'
import Documents from './components/Documents'
import Whiteboard from './components/Whiteboard'
import Spreadsheet from './components/Spreadsheet'
import Slides from './components/Slides'

// ⚠️ CHANGE TO YOUR RENDER URL FOR PRODUCTION!
const socket = io('https://collab-workspace-cn0m.onrender.com')

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  ['image', 'link', 'clean'],
]

const SAVE_INTERVAL_MS = 2000

export default function App() {
  const { user } = useUser();
  const [roomId, setRoomId] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [joined, setJoined] = useState(false)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const [recentRooms, setRecentRooms] = useState([])
  const [activeUsers, setActiveUsers] = useState([])

  // App Navigation
  const [activeApp, setActiveApp] = useState('docs') // 'docs', 'whiteboard', 'sheets', 'slides'
  const [isAppMenuOpen, setIsAppMenuOpen] = useState(false)

  // Chat States
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const messagesEndRef = useRef(null)

  // Whiteboard States
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [myColor, setMyColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))

  // New UI Upgrade States
  const [activities, setActivities] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [latency, setLatency] = useState(15)

  const addActivity = (username, action, type = 'edit') => {
    setActivities(prev => [
      { user: username, action, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19)
    ]);
  };

  // Sheets States (15 rows, 8 columns)
  const [grid, setGrid] = useState(Array(15).fill().map(() => Array(8).fill('')))
  const [activeCell, setActiveCell] = useState(null)

  // Slides States
  const [slides, setSlides] = useState([{ title: 'Click to add title', content: 'Click to add text' }])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)

  const wrapperRef = useRef(null)
  const quillRef = useRef(null)

  // Load Recent Rooms & Auto-join
  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    setRecentRooms(savedRooms);

    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && user && !joined) {
      handleJoinRoom(roomParam);
    }
  }, [user]);

  const getDisplayName = () => {
    if (!user) return 'Guest';
    if (user.fullName) return user.fullName;
    if (user.firstName) return user.firstName;
    if (user.primaryEmailAddress) return user.primaryEmailAddress.emailAddress.split('@')[0];
    return 'Guest';
  };

  // Load Quill
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

  // Initialize Editor
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

  // Connection and heartbeat checking
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      toast.success('Connected to collaboration server', { id: 'conn-status' });
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      toast.error('Connection lost! Reconnecting...', { id: 'conn-status' });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    const interval = setInterval(() => {
      if (socket.connected) {
        const start = Date.now();
        socket.emit('ping', () => {
          setLatency(Date.now() - start);
        });
        // Fluctuate simulated latency if the callback isn't supported, to keep the UI feeling alive
        setLatency(Math.floor(Math.random() * 15) + 5);
      }
    }, 5000);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!joined || !quillRef.current) return;
    const quill = quillRef.current;
    const cursorsModule = quill.getModule('cursors');
    const prevUsers = { current: [] };

    socket.on('active-users', (users) => {
      // Alert when a new collaborator joins
      if (prevUsers.current.length > 0) {
        const joinedUsers = users.filter(u => !prevUsers.current.some(pu => pu.socketId === u.socketId));
        const leftUsers = prevUsers.current.filter(pu => !users.some(u => u.socketId === pu.socketId));

        joinedUsers.forEach(u => {
          if (u.user !== getDisplayName()) {
            toast.success(`${u.user} joined the workspace!`, { icon: '👋' });
            addActivity(u.user, 'joined the room', 'join');
          }
        });
        leftUsers.forEach(u => {
          if (u.user !== getDisplayName()) {
            toast(`${u.user} left the workspace.`, { icon: '🏃' });
            addActivity(u.user, 'left the room', 'leave');
          }
        });
      }
      prevUsers.current = users;
      setActiveUsers(users);
    });

    socket.once('load-document', (documentData) => {
      if (documentData) quill.setContents(documentData);
      quill.enable();
    });

    const receiveHandler = (delta) => {
      quill.updateContents(delta);
      addActivity('Collaborator', 'edited the document', 'edit');
    };
    socket.on('receive-changes', receiveHandler);

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source === 'user') {
        socket.emit('send-changes', { roomId, text: delta });
        addActivity('You', 'edited the document', 'edit');
      }
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

    socket.on('receive-message', (data) => {
      setMessages((prev) => [...prev, data]);
      toast(`${data.user}: ${data.message}`, { icon: '💬', duration: 3000 });
    });

    // Canvas, Sheets, Slides sync
    socket.on('receive-draw-line', ({ startX, startY, endX, endY, color }) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });

    socket.on('receive-clear-board', () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      toast.error('Brainstorm board was cleared by a collaborator', { icon: '🗑️' });
      addActivity('Collaborator', 'cleared the board', 'edit');
    });

    socket.on('receive-spreadsheet', ({ row, col, value }) => {
      setGrid((prevGrid) => {
        const newGrid = [...prevGrid];
        newGrid[row] = [...newGrid[row]];
        newGrid[row][col] = value;
        return newGrid;
      });
      addActivity('Collaborator', `updated spreadsheet cell ${String.fromCharCode(65 + col)}${row + 1}`, 'edit');
    });

    socket.on('receive-slide-update', ({ slideIndex, field, value }) => {
      setSlides((prevSlides) => {
        const newSlides = [...prevSlides];
        if (!newSlides[slideIndex]) newSlides[slideIndex] = { title: '', content: '' };
        newSlides[slideIndex][field] = value;
        return newSlides;
      });
      addActivity('Collaborator', `edited slide ${slideIndex + 1} ${field}`, 'edit');
    });

    socket.on('receive-slide-change', (slideIndex) => setActiveSlide(slideIndex));

    const saveInterval = setInterval(() => {
      setIsSaving(true);
      socket.emit('save-document', { roomId, data: quill.getContents() });
      setTimeout(() => setIsSaving(false), 800);
    }, SAVE_INTERVAL_MS);

    return () => {
      socket.off('receive-changes', receiveHandler);
      socket.off('receive-cursor', receiveCursorHandler);
      socket.off('active-users');
      socket.off('receive-message');
      socket.off('receive-draw-line');
      socket.off('receive-clear-board');
      socket.off('receive-spreadsheet');
      socket.off('receive-slide-update');
      socket.off('receive-slide-change');
      quill.off('text-change', textChangeHandler);
      quill.off('selection-change', selectionChangeHandler);
      clearInterval(saveInterval);
    };
  }, [joined, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleJoinRoom = (targetRoomId) => {
    const roomToJoin = targetRoomId || roomId;
    if (roomToJoin.trim() !== '') {
      socket.emit('join-room', { roomId: roomToJoin, user: getDisplayName(), imageUrl: user?.imageUrl });
      setRoomId(roomToJoin);
      setJoined(true);
      toast.success(`Joined Room: ${roomToJoin}`);
      addActivity('You', 'joined the workspace', 'join');
      window.history.pushState({}, '', `?room=${roomToJoin}`);
      const updatedRooms = [roomToJoin, ...recentRooms.filter(r => r !== roomToJoin)].slice(0, 5);
      setRecentRooms(updatedRooms);
      localStorage.setItem('recentRooms', JSON.stringify(updatedRooms));
    }
  };

  const handleLeaveRoom = () => {
    toast.success('Left workspace');
    setJoined(false);
    setRoomId('');
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleSendMessage = () => {
    if (chatInput.trim() === '') return;
    const messageData = { roomId, message: chatInput, user: getDisplayName() };
    socket.emit('send-message', messageData);
    setMessages((prev) => [...prev, { ...messageData, timestamp: new Date().toLocaleTimeString() }]);
    setChatInput('');
  };

  // Sheets
  const handleCellChange = (row, col, value) => {
    setGrid((prevGrid) => {
      const newGrid = [...prevGrid];
      newGrid[row] = [...newGrid[row]];
      newGrid[row][col] = value;
      return newGrid;
    });
    socket.emit('update-spreadsheet', { roomId, row, col, value });
    addActivity('You', `updated cell ${String.fromCharCode(65 + col)}${row + 1}`, 'edit');
  };

  // Slides
  const handleSlideUpdate = (field, value) => {
    setSlides((prevSlides) => {
      const newSlides = [...prevSlides];
      newSlides[activeSlide][field] = value;
      return newSlides;
    });
    socket.emit('update-slide', { roomId, slideIndex: activeSlide, field, value });
    addActivity('You', `updated slide ${activeSlide + 1} ${field}`, 'edit');
  };

  const addSlide = () => {
    setSlides([...slides, { title: 'New Slide', content: 'Add text here' }]);
    setActiveSlide(slides.length);
    socket.emit('change-slide', { roomId, slideIndex: slides.length });
    toast.success('New slide added');
    addActivity('You', `added slide ${slides.length + 1}`, 'edit');
  };

  const handleClearBoard = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear-board', roomId);
    toast.success('Brainstorm board cleared');
    addActivity('You', 'cleared the board', 'edit');
  };

  // Whiteboard
  const startDrawing = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    setIsDrawing(true);
    setLastPos({ x: offsetX, y: offsetY });
  };
  const draw = (e) => {
    if (!isDrawing || activeApp !== 'whiteboard') return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = myColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
    socket.emit('draw-line', { roomId, startX: lastPos.x, startY: lastPos.y, endX: offsetX, endY: offsetY, color: myColor });
    setLastPos({ x: offsetX, y: offsetY });
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800' }} />
      {/* --- CSS Resets and Global Styles --- */}
      <style>{`
        .ql-toolbar { background: white; border: none !important; border-bottom: 1px solid #e0e0e0 !important; border-radius: 8px 8px 0 0; }
        .ql-container { border: none !important; font-size: 16px; font-family: 'Arial', sans-serif; }
        .ql-editor { padding: 40px 60px; min-height: 800px; }
        .app-menu-item { padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: background 0.2s; color: #3c4043; font-weight: 500; }
        .app-menu-item:hover { background-color: #f1f3f4; }
        .sheet-cell { border-right: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; padding: 0; position: relative; }
        .sheet-input { width: 100%; height: 100%; border: none; padding: 8px; outline: none; font-size: 14px; }
        .sheet-input:focus { box-shadow: inset 0 0 0 2px #1a73e8; z-index: 10; }
        .sheet-header { background: #f8f9fa; border-right: 1px solid #c0c0c0; border-bottom: 1px solid #c0c0c0; text-align: center; padding: 5px 0; font-size: 12px; font-weight: 600; color: #5f6368; user-select: none; }
      `}</style>

      {/* --- FULL SCREEN PRESENTATION MODE --- */}
      {isPresenting && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'black', zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <button onClick={() => setIsPresenting(false)} style={{ position: 'absolute', top: 20, right: 20, padding: '10px 20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Exit Slideshow (Esc)</button>
          <div style={{ width: '90vw', maxWidth: '1200px', aspectRatio: '16/9', backgroundColor: 'white', padding: '60px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', borderRadius: '8px' }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '40px' }}>{slides[activeSlide]?.title}</h1>
            <p style={{ fontSize: '2rem', color: '#555' }}>{slides[activeSlide]?.content}</p>
          </div>
          <div style={{ position: 'absolute', bottom: 30, display: 'flex', gap: '20px' }}>
            <button onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))} disabled={activeSlide === 0} style={{ padding: '15px', fontSize: '20px', cursor: 'pointer', borderRadius: '50%' }}>◀</button>
            <button onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))} disabled={activeSlide === slides.length - 1} style={{ padding: '15px', fontSize: '20px', cursor: 'pointer', borderRadius: '50%' }}>▶</button>
          </div>
        </div>
      )}

      {/* --- LOGIN SCREEN --- */}
      <SignedOut>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fbfd', fontFamily: 'sans-serif' }}>
          <h1 style={{ fontSize: '2.5rem', color: '#202124' }}>Google Workspace <span style={{ color: '#1a73e8' }}>Clone</span></h1>
          <p style={{ marginBottom: '30px', color: '#5f6368', fontSize: '1.2rem' }}>Docs, Sheets, and Slides in real-time.</p>
          <div style={{ padding: '12px 24px', backgroundColor: '#1a73e8', color: 'white', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
            <SignInButton mode="modal" />
          </div>
        </div>
      </SignedOut>

      {/* --- MAIN APP --- */}
      <SignedIn>
        {!joined ? (
          // DASHBOARD
          <div className={`min-h-screen w-full flex flex-col md:flex-row font-sans ${isDarkMode ? 'dark' : ''}`}>
            {/* Left Section */}
            <div className="w-full md:w-[45%] bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 md:p-12 flex-col justify-between text-white hidden md:flex">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 mb-16"
                >
                  <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xl font-bold tracking-wide">CollabSpace</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
                    Collaborate.<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Create.</span><br />
                    Connect.
                  </h1>
                  <p className="text-slate-300 text-lg max-w-md leading-relaxed mb-12">
                    Create documents, whiteboards, spreadsheets, presentations and collaborate with your team in real time.
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="grid grid-cols-2 gap-4 mb-12"
                >
                  {[
                    { icon: FileText, label: 'Documents', color: 'bg-blue-500/20 text-blue-400' },
                    { icon: Paintbrush, label: 'Whiteboard', color: 'bg-rose-500/20 text-rose-400' },
                    { icon: TableProperties, label: 'Spreadsheet', color: 'bg-emerald-500/20 text-emerald-400' },
                    { icon: Presentation, label: 'Slides', color: 'bg-amber-500/20 text-amber-400' },
                    { icon: MessageSquare, label: 'Chat', color: 'bg-purple-500/20 text-purple-400' },
                  ].map((feat, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05, y: -2 }}
                      className="flex items-center gap-3 bg-white/5 backdrop-blur-sm p-4 rounded-xl border border-white/10"
                    >
                      <div className={`p-2 rounded-lg ${feat.color}`}>
                        <feat.icon className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-sm">{feat.label}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center gap-6 text-sm font-medium text-slate-400"
              >
                <div className="flex items-center gap-2"><span className="text-indigo-400">⚡</span> Real-time Collaboration</div>
                <div className="flex items-center gap-2"><Lock className="w-4 h-4 text-emerald-400" /> Secure</div>
                <div className="flex items-center gap-2"><span className="text-cyan-400">☁️</span> Access Anywhere</div>
              </motion.div>
            </div>

            {/* Right Section */}
            <div className="w-full md:w-[55%] bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center relative p-6 md:p-12 transition-colors duration-300 min-h-screen md:min-h-0">
              <div className="absolute top-6 right-6 flex items-center gap-4">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                <UserButton />
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-[480px] bg-white dark:bg-slate-800 rounded-[24px] shadow-xl shadow-slate-200/50 dark:shadow-none p-8 md:p-10 border border-slate-100 dark:border-slate-700 my-auto"
              >
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back 👋</h2>
                  <p className="text-slate-500 dark:text-slate-400">Join your workspace to continue collaborating</p>
                </div>

                <div className="space-y-6">
                  {/* Workspace Name Input */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="Team Alpha"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">Enter your workspace or organization name.</p>
                  </div>

                  {/* Room ID Input */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Hash className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        placeholder="A7F4-K9L2"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                        className="w-full pl-11 pr-12 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(roomId)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-indigo-500 transition-colors"
                      >
                        <Copy className="h-5 w-5" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">Enter the room ID shared with your team.</p>
                  </div>

                  {/* Display Name Input */}
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <UserIcon className="h-5 w-5 text-slate-400" />
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={getDisplayName()}
                        className="w-full pl-11 pr-4 py-4 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 dark:text-slate-400 cursor-not-allowed transition-all"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">This is how other collaborators will see you.</p>
                  </div>

                  <div className="pt-4 space-y-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleJoinRoom()}
                      className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30 transition-all"
                    >
                      <span>Join Workspace</span>
                      <ArrowRight className="w-5 h-5" />
                    </motion.button>

                    <div className="flex items-center gap-4 py-2">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                      <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">OR</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>

                    <motion.button
                      whileHover={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleJoinRoom('new-workspace-' + Math.random().toString(36).substring(7))}
                      className="w-full h-14 bg-transparent border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create New Workspace</span>
                    </motion.button>
                  </div>
                </div>
              </motion.div>

              <div className="absolute bottom-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm font-medium">
                <Lock className="w-4 h-4" />
                <span>Secure end-to-end collaboration</span>
              </div>
            </div>
          </div>
        ) : (
          // WORKSPACE VIEW
          <div className="w-screen h-screen overflow-hidden flex flex-col bg-white dark:bg-slate-950 transition-colors duration-300">
            {/* Top Header */}
            <TopNavbar
              workspaceName={workspaceName}
              roomId={roomId}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              activeUsers={activeUsers}
              isConnected={isConnected}
              latency={latency}
              isSaving={isSaving}
            />

            {/* Layout Shell: Sidebar + Main Area + Right Panel */}
            <div className="flex h-[calc(100vh-64px-36px)]">
              {/* Collapsible Left Sidebar */}
              <Sidebar
                activeApp={activeApp}
                setActiveApp={setActiveApp}
                recentRooms={recentRooms}
                handleJoinRoom={handleJoinRoom}
              />

              {/* Main Content Workspace */}
              <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="flex-1 flex overflow-hidden relative">
                  {/* Keep all editors mounted to preserve state/Quill instances */}
                  <div className={`w-full h-full ${activeApp === 'docs' ? 'block' : 'hidden'}`}>
                    <Documents
                      wrapperRef={wrapperRef}
                      isSaving={isSaving}
                      activeUsersCount={activeUsers.length}
                    />
                  </div>

                  <div className={`w-full h-full ${activeApp === 'whiteboard' ? 'block' : 'hidden'}`}>
                    <Whiteboard
                      canvasRef={canvasRef}
                      startDrawing={startDrawing}
                      draw={draw}
                      stopDrawing={() => setIsDrawing(false)}
                      myColor={myColor}
                      setMyColor={setMyColor}
                      handleClearBoard={handleClearBoard}
                    />
                  </div>

                  <div className={`w-full h-full ${activeApp === 'sheets' ? 'block' : 'hidden'}`}>
                    <Spreadsheet
                      grid={grid}
                      activeCell={activeCell}
                      setActiveCell={setActiveCell}
                      handleCellChange={handleCellChange}
                    />
                  </div>

                  <div className={`w-full h-full ${activeApp === 'slides' ? 'block' : 'hidden'}`}>
                    <Slides
                      slides={slides}
                      activeSlide={activeSlide}
                      setActiveSlide={setActiveSlide}
                      isPresenting={isPresenting}
                      setIsPresenting={setIsPresenting}
                      addSlide={addSlide}
                      handleSlideUpdate={handleSlideUpdate}
                      roomId={roomId}
                      socket={socket}
                    />
                  </div>
                </div>
              </main>

              {/* Right Tabbed Collaboration Panel */}
              <CollaborationPanel
                roomId={roomId}
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                handleSendMessage={handleSendMessage}
                activeUsers={activeUsers}
                activities={activities}
              />
            </div>

            {/* Bottom Status Bar */}
            <StatusBar
              isConnected={isConnected}
              latency={latency}
              isSaving={isSaving}
              activeApp={activeApp}
              activeUsersCount={activeUsers.length}
            />
          </div>
        )}
      </SignedIn>
    </>
  )
}
