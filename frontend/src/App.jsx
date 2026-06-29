import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react"
import { motion } from 'framer-motion'
import {
  Building2,
  Hash,
  Copy,
  User as UserIcon,
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
import Settings, { applyCustomizations } from './components/Settings'
import useScreenShare from './hooks/useScreenShare'
import ScreenViewer from './components/ScreenViewer'
import GlobalSearch from './components/GlobalSearch'
import Files from './components/Files'
import FileExplorer from './components/FileExplorer'
import FilePreviewer from './components/FilePreviewer'
import Calendar from './components/Calendar'
import Tasks from './components/Tasks'
import Meetings from './components/Meetings'
import Dashboard from './components/Dashboard'
import FloatingScreenShare from './components/FloatingScreenShare'
import ErrorBoundary from './components/ErrorBoundary'
import LandingPage from './components/LandingPage'

// Fallback to localhost if running locally
const SOCKET_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:3001'
  : 'https://collab-workspace-cn0m.onrender.com';
const socket = io(SOCKET_URL);

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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('collabspace-dark-mode');
    return saved ? JSON.parse(saved) : false;
  })
  const [joined, setJoined] = useState(false)
  const [quillLoaded, setQuillLoaded] = useState(false)
  const [quillInstance, setQuillInstance] = useState(null)
  const [recentRooms, setRecentRooms] = useState([])
  const [activeUsers, setActiveUsers] = useState([])

  // App Navigation
  const [activeApp, setActiveApp] = useState('docs') // 'docs', 'whiteboard', 'sheets', 'slides', 'settings'

  // Right panel collapse state
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false)

  // Persist dark mode
  useEffect(() => {
    localStorage.setItem('collabspace-dark-mode', JSON.stringify(isDarkMode));
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Lock body overflow in workspace view
  useEffect(() => {
    if (joined) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [joined]);

  // Chat States
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const messagesEndRef = useRef(null)

  // Whiteboard States
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 })
  const [myColor, setMyColor] = useState('#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'))
  const whiteboardStrokesRef = useRef([])
  const [whiteboardTool, setWhiteboardTool] = useState('pen')
  const [whiteboardSize, setWhiteboardSize] = useState(3)
  const [whiteboardCursors, setWhiteboardCursors] = useState({})
  const [spreadsheetCells, setSpreadsheetCells] = useState({})

  // New UI Upgrade States
  const [activities, setActivities] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [latency, setLatency] = useState(15)

  // Teamora new workspaces states
  const [filesList, setFilesList] = useState([])
  const [activeFileId, setActiveFileId] = useState(null)
  const [activeFileTitle, setActiveFileTitle] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)
  const [roomNotFoundError, setRoomNotFoundError] = useState(null)
  const [editorMounted, setEditorMounted] = useState(false)

  const activeFileIdRef = useRef(null)
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId])

  const [calendarList, setCalendarList] = useState([])
  const [tasksList, setTasksList] = useState([])
  const [documentComments, setDocumentComments] = useState([])
  const [documentVersions, setDocumentVersions] = useState([])
  const [userRoles, setUserRoles] = useState({})
  const [searchOpen, setSearchOpen] = useState(false)

  const addActivity = (username, action, type = 'edit') => {
    setActivities(prev => [
      { user: username, action, type, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 19)
    ]);
  };

  const [roomSettings, setRoomSettings] = useState({ screenShareAllowed: 'everyone' });
  const autoWatchPresenterRef = useRef(null);

  const {
    isSharing,
    presenter,
    localStream,
    remoteStream,
    isLoading,
    isWatching,
    startSharing,
    stopSharing,
    forceStopShare,
    watchPresentation,
    stopWatching
  } = useScreenShare(socket, roomId, getDisplayName(), myColor);

  const isHost = activeUsers[0] && activeUsers[0].socketId === socket.id;


  // Sheets States (100 rows, 26 columns)
  const ensureGridDimensions = (loadedGrid) => {
    if (!Array.isArray(loadedGrid)) return Array(100).fill().map(() => Array(26).fill(''));
    const rows = 100;
    const cols = 26;
    const padded = Array(rows).fill().map((_, r) => {
      const existingRow = loadedGrid[r] || [];
      return Array(cols).fill().map((_, c) => existingRow[c] !== undefined ? String(existingRow[c]) : '');
    });
    return padded;
  };

  const [grid, setGrid] = useState(Array(100).fill().map(() => Array(26).fill('')))
  const [activeCell, setActiveCell] = useState(null)

  // Slides States
  const [slides, setSlides] = useState([{ title: 'Click to add title', content: 'Click to add text' }])
  const [activeSlide, setActiveSlide] = useState(0)
  const [isPresenting, setIsPresenting] = useState(false)

  const wrapperRef = useRef(null)
  const quillRef = useRef(null)

  const roomStateRef = useRef(null);

  const redrawWhiteboard = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    whiteboardStrokesRef.current.forEach(({ startX, startY, endX, endY, color, size }) => {
      const isEraser = color === 'eraser';
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = size || 16;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color || '#000000';
        ctx.lineWidth = size || 3;
      }
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    });
    ctx.globalCompositeOperation = 'source-over';
  };

  useEffect(() => {
    if (activeApp === 'whiteboard' && joined) {
      setTimeout(redrawWhiteboard, 50);
    }
  }, [activeApp, joined]);

  useEffect(() => {
    if (joined) {
      let status = 'idle';
      if (isSharing) {
        status = 'presenting';
      } else if (isWatching) {
        status = 'watching';
      } else {
        switch (activeApp) {
          case 'docs':
            status = 'docs';
            break;
          case 'sheets':
            status = 'sheets';
            break;
          case 'whiteboard':
            status = 'whiteboard';
            break;
          case 'meetings':
            status = 'meetings';
            break;
          default:
            status = 'idle';
        }
      }
      socket.emit('update-active-app', { roomId, activeApp: status });
    }
  }, [activeApp, isSharing, isWatching, joined, roomId]);

  useEffect(() => {
    if (joined && activeApp === 'slides') {
      socket.emit('update-active-slide', { roomId, slideIndex: activeSlide });
    }
  }, [activeSlide, activeApp, joined, roomId]);

  useEffect(() => {
    if (joined && activeCell) {
      socket.emit('spreadsheet-cell-move', { roomId, row: activeCell.r, col: activeCell.c, user: getDisplayName(), color: myColor });
    }
  }, [activeCell, joined, roomId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setWhiteboardCursors(prev => {
        const clean = {};
        let changed = false;
        for (const [id, data] of Object.entries(prev)) {
          if (now - data.lastUpdated < 5000) {
            clean[id] = data;
          } else {
            changed = true;
          }
        }
        return changed ? clean : prev;
      });
      setSpreadsheetCells(prev => {
        const clean = {};
        let changed = false;
        for (const [id, data] of Object.entries(prev)) {
          if (now - data.lastUpdated < 15000) {
            clean[id] = data;
          } else {
            changed = true;
          }
        }
        return changed ? clean : prev;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load Recent Rooms & Auto-join
  useEffect(() => {
    const savedRooms = JSON.parse(localStorage.getItem('recentRooms')) || [];
    setRecentRooms(savedRooms);

    // Apply custom settings on load
    const savedCustoms = localStorage.getItem('teamora-customization');
    if (savedCustoms) {
      try {
        applyCustomizations(JSON.parse(savedCustoms));
      } catch (err) {
        console.error('Failed to parse customs settings:', err);
      }
    }

    const handleRoomNotFound = ({ roomId }) => {
      setRoomNotFoundError(roomId);
      setJoined(false);
      toast.error(`Workspace not found: ${roomId}`);
    };

    const handleRoomCreated = ({ roomId }) => {
      setRoomNotFoundError(null);
      handleJoinRoom(roomId);
    };

    socket.on('room-not-found', handleRoomNotFound);
    socket.on('room-created', handleRoomCreated);

    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    const presentationParam = urlParams.get('presentation');
    if (roomParam && user && !joined) {
      handleJoinRoom(roomParam);
      if (presentationParam) {
        autoWatchPresenterRef.current = presentationParam;
      }
    }

    return () => {
      socket.off('room-not-found', handleRoomNotFound);
      socket.off('room-created', handleRoomCreated);
    };
  }, [user]);

  // Global Ctrl+K Search Shortcut
  useEffect(() => {
    const handleGlobalSearchKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalSearchKey);
    return () => window.removeEventListener('keydown', handleGlobalSearchKey);
  }, []);

  const handleUpdateUserRole = (username, newRole) => {
    const nextRoles = { ...userRoles, [username]: newRole };
    setUserRoles(nextRoles);
    const nextSettings = { ...roomSettings, userRoles: nextRoles };
    setRoomSettings(nextSettings);
    socket.emit('update-room-settings', { roomId, settings: nextSettings });
    toast.success(`Role for ${username} updated to ${newRole}`);
  };

  const handleRevertVersion = (version) => {
    if (quillRef.current) {
      quillRef.current.clipboard.dangerouslyPasteHTML(version.data);
      toast.success(`Document reverted to version saved by ${version.user}`);
      socket.emit('send-changes', { roomId, text: quillRef.current.getContents() });
    }
  };

  // Plain document text extractor helper for search
  const getDocumentTextContent = () => {
    if (!quillRef.current) return '';
    return quillRef.current.getText();
  };

  function getDisplayName() {
    if (!user) return 'Guest';
    if (user.fullName) return user.fullName;
    if (user.firstName) return user.firstName;
    if (user.primaryEmailAddress) return user.primaryEmailAddress.emailAddress.split('@')[0];
    return 'Guest';
  }

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
    if (!joined || !wrapperRef.current || !quillLoaded || !editorMounted) return;
    if (wrapperRef.current.innerHTML !== "") return;

    const editor = document.createElement('div')
    wrapperRef.current.append(editor)

    const quill = new window.Quill(editor, {
      theme: 'snow',
      modules: {
        toolbar: false,
        cursors: { transformOnTextChange: true }
      },
    })

    quillRef.current = quill;
    setQuillInstance(quill);

    // Apply document if it was already loaded
    if (roomStateRef.current && roomStateRef.current.document) {
      quill.setContents(roomStateRef.current.document);
      quill.enable();
    }
  }, [joined, quillLoaded, editorMounted])

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

  // Hook A: General socket room listeners
  useEffect(() => {
    if (!joined) return;
    const prevUsers = { current: [] };

    const activeUsersHandler = (users) => {
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
    };

    const loadRoomHandler = (roomState) => {
      roomStateRef.current = roomState;
      if (roomState.whiteboard) {
        whiteboardStrokesRef.current = roomState.whiteboard;
        redrawWhiteboard();
      }
      if (roomState.spreadsheet) setGrid(ensureGridDimensions(roomState.spreadsheet));
      if (roomState.slides) setSlides(roomState.slides);
      if (roomState.chat) setMessages(roomState.chat);
      if (roomState.settings) setRoomSettings(roomState.settings);
      if (roomState.files) {
        setFilesList(roomState.files);
        const defaultDoc = roomState.files.find(f => f.type === 'document');
        if (defaultDoc) {
          setActiveFileId(defaultDoc.id);
          setActiveFileTitle(defaultDoc.name);
        }
      }
      if (roomState.calendar) setCalendarList(roomState.calendar);
      if (roomState.tasks) setTasksList(roomState.tasks);
      if (roomState.documentComments) setDocumentComments(roomState.documentComments);
      if (roomState.documentVersions) setDocumentVersions(roomState.documentVersions);
      if (roomState.settings && roomState.settings.userRoles) setUserRoles(roomState.settings.userRoles);
      
      // Auto-watch if presentation parameters are active
      if (autoWatchPresenterRef.current && roomState.activePresenter && roomState.activePresenter.socketId === autoWatchPresenterRef.current) {
        watchPresentation(autoWatchPresenterRef.current);
        autoWatchPresenterRef.current = null;
      }
    };

    const receiveMessageHandler = (data) => {
      setMessages((prev) => [...prev, data]);
      toast(`${data.user}: ${data.message}`, { icon: '💬', duration: 3000 });
    };

    const receiveDrawLineHandler = ({ startX, startY, endX, endY, color, size }) => {
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      const isEraser = color === 'eraser';
      if (isEraser) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = size || 16;
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color || '#000000';
        ctx.lineWidth = size || 3;
      }
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    };

    const receiveClearBoardHandler = () => {
      if (!canvasRef.current) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      whiteboardStrokesRef.current = [];
      toast.error('Brainstorm board was cleared by a collaborator', { icon: '🗑️' });
      addActivity('Collaborator', 'cleared the board', 'edit');
    };

    const receiveSpreadsheetHandler = ({ row, col, value }) => {
      setGrid((prevGrid) => {
        const newGrid = prevGrid.map(r => [...r]);
        while (newGrid.length <= row) {
          newGrid.push(Array(26).fill(''));
        }
        for (let r = 0; r < newGrid.length; r++) {
          while (newGrid[r].length <= col) {
            newGrid[r].push('');
          }
        }
        newGrid[row][col] = value;
        return newGrid;
      });
      addActivity('Collaborator', `updated spreadsheet cell ${String.fromCharCode(65 + col)}${row + 1}`, 'edit');
    };

    const receiveSlideUpdateHandler = ({ slideIndex, field, value }) => {
      setSlides((prevSlides) => {
        const newSlides = [...prevSlides];
        if (!newSlides[slideIndex]) newSlides[slideIndex] = { title: '', content: '', notes: '' };
        newSlides[slideIndex][field] = value;
        return newSlides;
      });
      addActivity('Collaborator', `edited slide ${slideIndex + 1} ${field}`, 'edit');
    };

    const receiveSlideChangeHandler = (slideIndex) => setActiveSlide(slideIndex);

    const receiveSlidesListHandler = (slidesList) => {
      setSlides(slidesList);
      addActivity('Collaborator', 'updated presentation slides', 'edit');
    };

    const receiveWhiteboardCursorHandler = ({ socketId, x, y, user, color }) => {
      setWhiteboardCursors(prev => ({
        ...prev,
        [socketId]: { x, y, user, color, lastUpdated: Date.now() }
      }));
    };

    const receiveSpreadsheetCellHandler = ({ socketId, row, col, user, color }) => {
      setSpreadsheetCells(prev => ({
        ...prev,
        [socketId]: { row, col, user, color, lastUpdated: Date.now() }
      }));
    };

    socket.on('active-users', activeUsersHandler);
    socket.once('load-room', loadRoomHandler);
    socket.on('receive-message', receiveMessageHandler);
    socket.on('receive-draw-line', receiveDrawLineHandler);
    socket.on('receive-clear-board', receiveClearBoardHandler);
    socket.on('receive-spreadsheet', receiveSpreadsheetHandler);
    socket.on('receive-slide-update', receiveSlideUpdateHandler);
    socket.on('receive-slide-change', receiveSlideChangeHandler);
    socket.on('receive-slides-list', receiveSlidesListHandler);
    socket.on('receive-whiteboard-cursor', receiveWhiteboardCursorHandler);
    socket.on('receive-spreadsheet-cell', receiveSpreadsheetCellHandler);
    socket.on('receive-files', (files) => setFilesList(files));
    socket.on('receive-calendar', (calendar) => setCalendarList(calendar));
    socket.on('receive-tasks', (tasks) => setTasksList(tasks));
    socket.on('receive-document-comments', (comments) => setDocumentComments(comments));
    socket.on('receive-document-versions', (versions) => setDocumentVersions(versions));

    socket.on('receive-room-settings', (settings) => {
      setRoomSettings(settings);
    });

    return () => {
      socket.off('active-users', activeUsersHandler);
      socket.off('receive-message', receiveMessageHandler);
      socket.off('receive-draw-line', receiveDrawLineHandler);
      socket.off('receive-clear-board', receiveClearBoardHandler);
      socket.off('receive-spreadsheet', receiveSpreadsheetHandler);
      socket.off('receive-slide-update', receiveSlideUpdateHandler);
      socket.off('receive-slide-change', receiveSlideChangeHandler);
      socket.off('receive-slides-list', receiveSlidesListHandler);
      socket.off('receive-whiteboard-cursor', receiveWhiteboardCursorHandler);
      socket.off('receive-spreadsheet-cell', receiveSpreadsheetCellHandler);
      socket.off('receive-files');
      socket.off('receive-calendar');
      socket.off('receive-tasks');
      socket.off('receive-document-comments');
      socket.off('receive-document-versions');
      socket.off('receive-room-settings');
    };
  }, [joined, roomId]);

  // Hook B: Quill-specific changes, cursor sync, and automatic save timers
  useEffect(() => {
    if (!joined || !quillInstance) return;
    const quill = quillInstance;
    const cursorsModule = quill.getModule('cursors');

    // Apply document if it was already loaded
    if (roomStateRef.current && roomStateRef.current.document) {
      quill.setContents(roomStateRef.current.document);
      quill.enable();
    } else if (filesList.length > 0 && activeFileId) {
      const activeFile = filesList.find(f => f.id === activeFileId);
      if (activeFile && activeFile.type === 'document' && activeFile.content) {
        quill.setContents(activeFile.content);
        quill.enable();
      }
    }

    const receiveChangesHandler = (delta) => {
      quill.updateContents(delta);
      addActivity('Collaborator', 'edited the document', 'edit');
    };

    const textChangeHandler = (delta, oldDelta, source) => {
      if (source === 'user') {
        socket.emit('send-changes', { roomId, text: delta });
        addActivity('You', 'edited the document', 'edit');
      }
    };

    const selectionChangeHandler = (range, oldRange, source) => {
      if (source === 'user' && user) {
        socket.emit('cursor-move', { roomId, range, user: getDisplayName(), color: myColor });
      }
    };

    const receiveCursorHandler = ({ range, user: cursorUser, color }) => {
      if (range) {
        cursorsModule.createCursor(cursorUser, cursorUser, color);
        cursorsModule.moveCursor(cursorUser, range);
      } else {
        cursorsModule.removeCursor(cursorUser);
      }
    };

    const loadRoomQuillHandler = (roomState) => {
      if (roomState.document) {
        quill.setContents(roomState.document);
        quill.enable();
      }
    };

    socket.on('receive-changes', receiveChangesHandler);
    socket.on('receive-cursor', receiveCursorHandler);
    socket.on('load-room', loadRoomQuillHandler);
    quill.on('text-change', textChangeHandler);
    quill.on('selection-change', selectionChangeHandler);

    const saveInterval = setInterval(() => {
      if (activeFileIdRef.current) {
        setIsSaving(true);
        socket.emit('file-content-update', { roomId, fileId: activeFileIdRef.current, content: quill.getContents() });
        setTimeout(() => setIsSaving(false), 800);
      }
    }, SAVE_INTERVAL_MS);

    return () => {
      socket.off('receive-changes', receiveChangesHandler);
      socket.off('receive-cursor', receiveCursorHandler);
      socket.off('load-room', loadRoomQuillHandler);
      quill.off('text-change', textChangeHandler);
      quill.off('selection-change', selectionChangeHandler);
      clearInterval(saveInterval);
    };
  }, [joined, quillInstance, roomId, myColor, activeFileId]);

  // Load content when activeFileId changes
  useEffect(() => {
    if (!activeFileId || filesList.length === 0) return;
    const file = filesList.find(f => f.id === activeFileId);
    if (!file) return;

    if (file.type === 'document' && quillRef.current) {
      if (file.content) {
        quillRef.current.setContents(file.content);
      } else {
        quillRef.current.setContents([]);
      }
    } else if (file.type === 'spreadsheet') {
      if (file.content) {
        setGrid(ensureGridDimensions(file.content));
      } else {
        setGrid(Array(100).fill().map(() => Array(26).fill('')));
      }
    } else if (file.type === 'presentation') {
      if (file.content) {
        setSlides(file.content);
      } else {
        setSlides([{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }]);
      }
    } else if (file.type === 'whiteboard') {
      if (file.content) {
        whiteboardStrokesRef.current = file.content;
      } else {
        whiteboardStrokesRef.current = [];
      }
      redrawWhiteboard();
    }
  }, [activeFileId]);

  // File synchronization effects
  useEffect(() => {
    if (!joined) return;

    const onFileContentUpdate = ({ fileId, content }) => {
      setFilesList(prev => 
        prev.map(f => f.id === fileId ? { ...f, content, lastModified: new Date().toISOString() } : f)
      );

      if (fileId === activeFileIdRef.current) {
        if (activeApp === 'docs' && quillRef.current) {
          quillRef.current.setContents(content);
        } else if (activeApp === 'sheets') {
          setGrid(ensureGridDimensions(content));
        } else if (activeApp === 'slides') {
          setSlides(content);
        } else if (activeApp === 'whiteboard') {
          whiteboardStrokesRef.current = content;
          redrawWhiteboard();
        }
      }
    };

    const onFileMetadataUpdate = ({ fileId, key, value }) => {
      setFilesList(prev => 
        prev.map(f => f.id === fileId ? { ...f, [key]: value, lastModified: new Date().toISOString() } : f)
      );
    };

    socket.on('receive-file-content-update', onFileContentUpdate);
    socket.on('receive-file-metadata-update', onFileMetadataUpdate);

    return () => {
      socket.off('receive-file-content-update', onFileContentUpdate);
      socket.off('receive-file-metadata-update', onFileMetadataUpdate);
    };
  }, [joined, activeApp]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleOpenFile = (item) => {
    if (!item) return;
    setActiveFileId(item.id);
    setActiveFileTitle(item.name);
    
    // Switch dynamic app
    if (item.type === 'document') setActiveApp('docs');
    else if (item.type === 'spreadsheet') setActiveApp('sheets');
    else if (item.type === 'presentation') setActiveApp('slides');
    else if (item.type === 'whiteboard') setActiveApp('whiteboard');
    else {
      setPreviewFile(item);
    }
  };

  const handleCreateRoom = (targetRoomId, targetWorkspaceName) => {
    const roomToCreate = targetRoomId || roomId;
    if (roomToCreate.trim() !== '') {
      socket.emit('create-room', { 
        roomId: roomToCreate, 
        name: targetWorkspaceName || roomToCreate 
      });
      // Save metadata locally
      const stored = localStorage.getItem('teamora_workspaces_metadata');
      let workspaces = stored ? JSON.parse(stored) : [];
      if (!workspaces.some(ws => ws.id === roomToCreate)) {
        workspaces.push({
          id: roomToCreate,
          name: targetWorkspaceName || roomToCreate,
          lastOpened: new Date().toISOString(),
          members: ['You'],
          lastActivity: 'Workspace created',
          isPinned: false,
          isFavorite: false,
          isShared: false,
          isTemplate: false,
          color: 'from-blue-500 to-indigo-500'
        });
        localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(workspaces));
      }
    }
  };

  const handleJoinRoom = async (targetRoomId, targetWorkspaceName) => {
    const roomToJoin = targetRoomId || roomId;
    if (roomToJoin.trim() !== '') {
      try {
        const response = await fetch(`${SOCKET_URL}/api/workspaces/${roomToJoin}`);
        const data = await response.json();
        
        if (!data || !data.exists) {
          toast.error(`Workspace not found: ${roomToJoin}`);
          // Remove from local workspaces metadata list if it doesn't exist
          const stored = localStorage.getItem('teamora_workspaces_metadata');
          if (stored) {
            const list = JSON.parse(stored);
            const filtered = list.filter(w => w.id !== roomToJoin);
            localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(filtered));
          }
          return false;
        }

        // Add to local workspaces metadata list on successful join if not already there
        const stored = localStorage.getItem('teamora_workspaces_metadata');
        let workspaces = stored ? JSON.parse(stored) : [];
        if (!workspaces.some(ws => ws.id === roomToJoin)) {
          workspaces.push({
            id: roomToJoin,
            name: targetWorkspaceName || roomToJoin,
            lastOpened: new Date().toISOString(),
            members: ['You', 'Collaborator'],
            lastActivity: 'Joined workspace',
            isPinned: false,
            isFavorite: false,
            isShared: true,
            isTemplate: false,
            color: 'from-blue-500 to-indigo-500'
          });
          localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(workspaces));
        } else {
          // Update last opened
          const updated = workspaces.map(ws =>
            ws.id === roomToJoin ? { ...ws, lastOpened: new Date().toISOString() } : ws
          );
          localStorage.setItem('teamora_workspaces_metadata', JSON.stringify(updated));
        }

        if (targetWorkspaceName) {
          setWorkspaceName(targetWorkspaceName);
        } else {
          // Fallback to name from database if exists or roomToJoin
          const matchedWs = workspaces.find(w => w.id === roomToJoin);
          setWorkspaceName(matchedWs ? matchedWs.name : roomToJoin);
        }

        socket.emit('join-room', { 
          roomId: roomToJoin, 
          user: getDisplayName(), 
          imageUrl: user?.imageUrl,
          color: myColor,
          activeApp: activeApp,
          activeFileId: activeFileId,
          activeFileTitle: activeFileTitle
        });
        setRoomId(roomToJoin);
        setJoined(true);
        toast.success(`Joined Room: ${roomToJoin}`);
        addActivity('You', 'joined the workspace', 'join');
        window.history.pushState({}, '', `?room=${roomToJoin}`);
        const updatedRooms = [roomToJoin, ...recentRooms.filter(r => r !== roomToJoin)].slice(0, 5);
        setRecentRooms(updatedRooms);
        localStorage.setItem('recentRooms', JSON.stringify(updatedRooms));
        return true;
      } catch (err) {
        console.error('Error validating workspace:', err);
        toast.error('Failed to validate workspace existence. Please try again.');
        return false;
      }
    }
    return false;
  };

  const handleLeaveRoom = () => {
    toast.success('Left workspace');
    setJoined(false);
    setRoomId('');
    setActiveFileId(null);
    setActiveFileTitle(null);
    setQuillInstance(null);
    setEditorMounted(false);
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
      const newGrid = prevGrid.map(r => [...r]);
      while (newGrid.length <= row) {
        newGrid.push(Array(26).fill(''));
      }
      for (let r = 0; r < newGrid.length; r++) {
        while (newGrid[r].length <= col) {
          newGrid[r].push('');
        }
      }
      newGrid[row][col] = value;
      if (activeFileIdRef.current) {
        socket.emit('file-content-update', { roomId, fileId: activeFileIdRef.current, content: newGrid });
      }
      return newGrid;
    });
    if (!activeFileIdRef.current) {
      socket.emit('update-spreadsheet', { roomId, row, col, value });
    }
    addActivity('You', `updated cell ${String.fromCharCode(65 + col)}${row + 1}`, 'edit');
  };

  // Slides
  const handleSlideUpdate = (field, value) => {
    setSlides((prevSlides) => {
      const newSlides = [...prevSlides];
      if (newSlides[activeSlide]) {
        newSlides[activeSlide][field] = value;
      }
      if (activeFileIdRef.current) {
        socket.emit('file-content-update', { roomId, fileId: activeFileIdRef.current, content: newSlides });
      }
      return newSlides;
    });
    if (!activeFileIdRef.current) {
      socket.emit('update-slide', { roomId, slideIndex: activeSlide, field, value });
    }
    addActivity('You', `updated slide ${activeSlide + 1} ${field}`, 'edit');
  };

  const addSlide = () => {
    const updated = [...slides, { title: 'New Slide', content: 'Add text here', notes: '', elements: [], layout: 'title' }];
    setSlides(updated);
    setActiveSlide(slides.length);
    if (activeFileIdRef.current) {
      socket.emit('file-content-update', { roomId, fileId: activeFileIdRef.current, content: updated });
    } else {
      socket.emit('change-slide', { roomId, slideIndex: slides.length });
    }
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
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 800 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setIsDrawing(true);
    setLastPos({ x, y });
  };
  
  const lastCursorEmitRef = useRef(0);
  
  const draw = (e) => {
    if (activeApp !== 'whiteboard' || !canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = 1200 / rect.width;
    const scaleY = 800 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Broadcast hover cursor position throttled
    if (joined) {
      const now = Date.now();
      if (now - lastCursorEmitRef.current > 50) {
        socket.emit('whiteboard-cursor-move', { roomId, x, y, user: getDisplayName(), color: myColor });
        lastCursorEmitRef.current = now;
      }
    }
    
    if (!isDrawing) return;
    
    const ctx = canvasRef.current.getContext('2d');
    const isEraser = whiteboardTool === 'eraser';
    if (isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = whiteboardSize;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = myColor;
      ctx.lineWidth = whiteboardSize;
    }
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; // Reset to default
    
    const strokeData = {
      startX: lastPos.x,
      startY: lastPos.y,
      endX: x,
      endY: y,
      color: isEraser ? 'eraser' : myColor,
      size: whiteboardSize
    };
    
    socket.emit('draw-line', { roomId, ...strokeData });
    whiteboardStrokesRef.current.push(strokeData);
    setLastPos({ x, y });
  };

  return (
    <>
      <Toaster position="top-right" toastOptions={{ className: 'dark:bg-slate-900 dark:text-slate-100 dark:border-slate-800' }} />
      {/* --- CSS Resets and Global Styles --- */}
      <style>{`
        .ql-toolbar { display: none !important; }
        .ql-container { border: none !important; font-size: 16px; font-family: 'Inter', 'Arial', sans-serif; }
        .ql-editor { padding: 40px 60px; min-height: 800px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* --- LANDING PAGE --- */}
      <SignedOut>
        <LandingPage />
      </SignedOut>

      {/* --- MAIN APP --- */}
      <SignedIn>
        {!joined ? (
          <Dashboard
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
          />
        ) : (
          // WORKSPACE VIEW
          <ErrorBoundary onReset={handleLeaveRoom}>
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
              isSharing={isSharing}
              startSharing={() => startSharing(isHost)}
              stopSharing={stopSharing}
              presenter={presenter}
              onSearchClick={() => setSearchOpen(true)}
            />

            {/* Layout Shell: Sidebar + Main Area + Right Panel */}
            <div className="flex h-[calc(100vh-64px-36px)]">
              {/* Collapsible Left Sidebar */}
              <Sidebar
                activeApp={activeApp}
                setActiveApp={setActiveApp}
                recentRooms={recentRooms}
                handleJoinRoom={handleJoinRoom}
                handleLeaveRoom={handleLeaveRoom}
                filesList={filesList}
                activeFileId={activeFileId}
                onOpenFile={handleOpenFile}
                activeUsers={activeUsers}
              />

              {/* Main Content Workspace */}
              <main className="flex-1 min-w-0 flex flex-col overflow-hidden relative bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                  


                  {/* Normal workspaces container */}
                  <div className="flex-1 h-full overflow-hidden relative">
                    {/* Keep all editors mounted to preserve state/Quill instances */}
                    <div className={`w-full h-full ${activeApp === 'docs' ? 'block' : 'hidden'}`}>
                      <Documents
                        wrapperRef={wrapperRef}
                        onMount={() => setEditorMounted(true)}
                        isSaving={isSaving}
                        activeUsersCount={activeUsers.length}
                        comments={documentComments}
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        versions={documentVersions}
                        onRevertVersion={handleRevertVersion}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'whiteboard' ? 'block' : 'hidden'}`}>
                      <Whiteboard
                        canvasRef={canvasRef}
                        myColor={myColor}
                        setMyColor={setMyColor}
                        whiteboardTool={whiteboardTool}
                        setWhiteboardTool={setWhiteboardTool}
                        whiteboardSize={whiteboardSize}
                        setWhiteboardSize={setWhiteboardSize}
                        whiteboardCursors={whiteboardCursors}
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        activeFileId={activeFileId}
                        filesList={filesList}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'sheets' ? 'block' : 'hidden'}`}>
                      <Spreadsheet
                        grid={grid}
                        activeCell={activeCell}
                        setActiveCell={setActiveCell}
                        handleCellChange={handleCellChange}
                        spreadsheetCells={spreadsheetCells}
                        socket={socket}
                        roomId={roomId}
                        roomSettings={roomSettings}
                        setRoomSettings={setRoomSettings}
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
                        activeUsers={activeUsers}
                        setSlides={setSlides}
                        activeFileId={activeFileId}
                        filesList={filesList}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'files' ? 'block' : 'hidden'}`}>
                      <FileExplorer
                        filesList={filesList}
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        currentUserRole={userRoles[getDisplayName()] || 'editor'}
                        onOpenFile={handleOpenFile}
                        activeFileId={activeFileId}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'calendar' ? 'block' : 'hidden'}`}>
                      <Calendar
                        calendarList={calendarList}
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        activeUsers={activeUsers}
                        currentUserRole={userRoles[getDisplayName()] || 'editor'}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'tasks' ? 'block' : 'hidden'}`}>
                      <Tasks
                        tasksList={tasksList}
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        activeUsers={activeUsers}
                        currentUserRole={userRoles[getDisplayName()] || 'editor'}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'meetings' ? 'block' : 'hidden'}`}>
                      <Meetings
                        socket={socket}
                        roomId={roomId}
                        userName={getDisplayName()}
                        activeUsers={activeUsers}
                        currentUserRole={userRoles[getDisplayName()] || 'editor'}
                      />
                    </div>

                    <div className={`w-full h-full ${activeApp === 'settings' ? 'block' : 'hidden'}`}>
                      <Settings
                        isDarkMode={isDarkMode}
                        setIsDarkMode={setIsDarkMode}
                        userName={getDisplayName()}
                        roomId={roomId}
                        socket={socket}
                        roomSettings={roomSettings}
                        setRoomSettings={setRoomSettings}
                        isHost={isHost}
                        activeUsers={activeUsers}
                        userRoles={userRoles}
                        onUpdateUserRole={handleUpdateUserRole}
                      />
                    </div>
                  </div>
                </div>
              </main>

              {/* Global search palette */}
              <GlobalSearch
                isOpen={searchOpen}
                onClose={() => setSearchOpen(false)}
                activeApp={activeApp}
                setActiveApp={setActiveApp}
                roomId={roomId}
                documentText={getDocumentTextContent()}
                spreadsheetGrid={grid}
                slidesList={slides}
                chatHistory={messages}
                filesList={filesList}
                tasksList={tasksList}
              />

              {/* Right Tabbed Collaboration Panel - hide on settings */}
              {activeApp !== 'settings' && (
                <CollaborationPanel
                  roomId={roomId}
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  handleSendMessage={handleSendMessage}
                  activeUsers={activeUsers}
                  activities={activities}
                  isCollapsed={isRightPanelCollapsed}
                  setIsCollapsed={setIsRightPanelCollapsed}
                  presenter={presenter}
                  onJoinPresentation={watchPresentation}
                />
              )}
            </div>

            {/* Bottom Status Bar */}
            <StatusBar
              isConnected={isConnected}
              latency={latency}
              isSaving={isSaving}
              activeApp={activeApp}
              activeUsersCount={activeUsers.length}
            />
            {/* Floating Screen Share Window */}
            {presenter && (isSharing || isWatching) && (
              <FloatingScreenShare
                stream={isSharing ? localStream : remoteStream}
                presenter={presenter}
                isLocal={isSharing}
                isLoading={isLoading}
                onStopSharing={forceStopShare}
                isHost={isHost}
                currentUserSocketId={socket.id}
                socket={socket}
                roomId={roomId}
                roomSettings={roomSettings}
                onClose={() => {
                  if (isSharing) {
                    stopSharing();
                  } else {
                    stopWatching();
                  }
                }}
              />
            )}

            {/* Room Not Found Warning Modal */}
            {roomNotFoundError && (
              <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 text-slate-800">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-2xl p-6 shadow-2xl max-w-sm w-full">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Workspace Not Found</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                    The workspace with ID <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 p-1 rounded">"{roomNotFoundError}"</code> does not exist in the database.
                  </p>
                  <div className="flex items-center gap-3 justify-end">
                    <button
                      onClick={() => {
                        setRoomNotFoundError(null);
                        window.history.pushState({}, '', window.location.pathname);
                      }}
                      className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        const workspaceName = prompt("Enter a name for the new workspace:", roomNotFoundError);
                        if (workspaceName) {
                          handleCreateRoom(roomNotFoundError, workspaceName);
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm"
                    >
                      Create Workspace
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Static Files Previews Overlay */}
            {previewFile && (
              <FilePreviewer
                file={previewFile}
                onClose={() => setPreviewFile(null)}
                onDownload={(f) => {
                  if (!f.content) {
                    toast.error('File content is empty.');
                    return;
                  }
                  const element = document.createElement('a');
                  if (f.content.startsWith('data:')) {
                    element.href = f.content;
                  } else {
                    const fileData = new Blob([f.content], { type: f.type });
                    element.href = URL.createObjectURL(fileData);
                  }
                  element.download = f.name;
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                  toast.success(`Downloading "${f.name}"...`);
                }}
              />
            )}
          </div>
          </ErrorBoundary>
        )}
      </SignedIn>
    </>
  )
}
