const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// --- DATABASE SETUP ---
const MONGO_URI = 'mongodb+srv://collaborate:collaborate@cluster0.lsqk5i9.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Unified Room schema that persists everything per room
const RoomSchema = new mongoose.Schema({
  _id: String, // We use the Room ID as the database ID
  document: { type: Object, default: null }, // Quill Delta
  documentComments: { type: Array, default: [] }, // comments [{ id, user, text, timestamp, range }]
  documentVersions: { type: Array, default: [] }, // history [{ versionId, timestamp, user, data }]
  whiteboard: { type: Array, default: [] }, // strokes & elements [{ type, startX, startY, endX, endY, color, size, text, x, y, width, height }]
  spreadsheet: { type: Array, default: null }, // 2D array of grid cells [[String]]
  spreadsheetConfig: { type: Object, default: {} }, // sorting, conditional formatting, pivot configs
  slides: { 
    type: Array, 
    default: [{ title: 'Click to add title', content: 'Click to add text', notes: '' }] 
  },
  chat: { type: Array, default: [] }, // messages [{ message, user, timestamp, attachmentId, replyTo, pinned }]
  settings: { type: Object, default: {} },
  files: { type: Array, default: [] }, // [{ id, name, type, size, content, folderId, uploadedBy, uploadedAt, version }]
  calendar: { type: Array, default: [] }, // [{ id, title, start, end, description, category, recurring, attendees }]
  tasks: { type: Array, default: [] } // [{ id, title, description, status, priority, assignee, dueDate, comments }]
});
const Room = mongoose.model('Room', RoomSchema);

// --- SERVER SETUP ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/workspaces/:id', async (req, res) => {
  try {
    const roomId = req.params.id;
    let roomExists = !!roomsCache[roomId];
    if (!roomExists) {
      const dbRoom = await Room.findById(roomId);
      if (dbRoom) {
        roomExists = true;
      }
    }
    res.json({ exists: roomExists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

// --- STATE CACHING & AUTOSAVE ---
const roomsCache = {};
const dirtyRooms = new Set();

// Periodically write modified rooms from memory cache to MongoDB (throttled auto-save)
setInterval(async () => {
  if (dirtyRooms.size === 0) return;
  
  const roomsToSave = Array.from(dirtyRooms);
  dirtyRooms.clear();
  
  for (const roomId of roomsToSave) {
    const cachedRoom = roomsCache[roomId];
    if (!cachedRoom) continue;
    
    try {
      await Room.findByIdAndUpdate(roomId, {
        document: cachedRoom.document,
        documentComments: cachedRoom.documentComments,
        documentVersions: cachedRoom.documentVersions,
        whiteboard: cachedRoom.whiteboard,
        spreadsheet: cachedRoom.spreadsheet,
        spreadsheetConfig: cachedRoom.spreadsheetConfig,
        slides: cachedRoom.slides,
        chat: cachedRoom.chat,
        settings: cachedRoom.settings,
        files: cachedRoom.files,
        calendar: cachedRoom.calendar,
        tasks: cachedRoom.tasks
      }, { upsert: true });
      console.log(`💾 Auto-saved room ${roomId} to MongoDB.`);
    } catch (err) {
      console.error(`❌ Error auto-saving room ${roomId}:`, err);
      dirtyRooms.add(roomId); // Retry next cycle
    }
  }
}, 3000);

// Active users tracking in memory
const roomUsers = {};
const roomPresenters = {}; // { roomId: { socketId, user, color } }

// --- REAL-TIME & DATABASE LOGIC ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 1. Join Room: Loads complete state from cache/database (Verifies room exists)
  socket.on('join-room', async ({ roomId, user, imageUrl, color, activeApp, activeFileId, activeFileTitle }) => {
    // Load from database if not in server cache
    let roomExists = !!roomsCache[roomId];
    if (!roomExists) {
      try {
        const dbRoom = await Room.findById(roomId);
        if (dbRoom) {
          roomExists = true;
          roomsCache[roomId] = {
            document: dbRoom.document,
            documentComments: dbRoom.documentComments || [],
            documentVersions: dbRoom.documentVersions || [],
            whiteboard: dbRoom.whiteboard || [],
            spreadsheet: dbRoom.spreadsheet || Array(100).fill().map(() => Array(26).fill('')),
            spreadsheetConfig: dbRoom.spreadsheetConfig || {},
            slides: dbRoom.slides || [{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }],
            chat: dbRoom.chat || [],
            settings: dbRoom.settings || {},
            files: dbRoom.files || [],
            calendar: dbRoom.calendar || [],
            tasks: dbRoom.tasks || []
          };
        }
      } catch (err) {
        console.error('Error querying room:', err);
      }
    }

    if (!roomExists) {
      // Validate that room exists. If not found, emit room-not-found and abort!
      socket.emit('room-not-found', { roomId });
      return;
    }

    socket.join(roomId);
    
    // Track user for active-users
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id); // Remove duplicates
    roomUsers[roomId].push({ 
      socketId: socket.id, 
      user, 
      imageUrl, 
      color, 
      activeApp: activeApp || 'docs',
      activeFileId: activeFileId || null,
      activeFileTitle: activeFileTitle || null
    });
    
    // Broadcast active users
    io.to(roomId).emit('active-users', roomUsers[roomId]);

    // Send complete saved room state back to user who joined
    if (roomsCache[roomId]) {
      const activePresenter = roomPresenters[roomId] || null;
      socket.emit('load-room', { ...roomsCache[roomId], activePresenter });
    }
  });

  // 2. Create Room: Explicit room creation event
  socket.on('create-room', async ({ roomId, name }) => {
    try {
      let dbRoom = await Room.findById(roomId);
      if (!dbRoom) {
        const defaultGrid = Array(100).fill().map(() => Array(26).fill(''));
        dbRoom = await Room.create({
          _id: roomId,
          document: null,
          documentComments: [],
          documentVersions: [],
          whiteboard: [],
          spreadsheet: defaultGrid,
          spreadsheetConfig: {},
          slides: [{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }],
          chat: [],
          settings: { name: name || 'New Workspace' },
          files: [
            { id: 'file-doc-default', name: 'Getting Started.docx', type: 'document', folderId: null, content: null, comments: [], versions: [], lastModified: new Date().toISOString() },
            { id: 'file-sheet-default', name: 'Project Budget.xlsx', type: 'spreadsheet', folderId: null, content: Array(100).fill().map(() => Array(26).fill('')), config: {}, lastModified: new Date().toISOString() },
            { id: 'file-slide-default', name: 'Pitch Slide.pptx', type: 'presentation', folderId: null, content: [{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }], lastModified: new Date().toISOString() }
          ],
          calendar: [],
          tasks: []
        });
      }
      roomsCache[roomId] = {
        document: dbRoom.document,
        documentComments: dbRoom.documentComments || [],
        documentVersions: dbRoom.documentVersions || [],
        whiteboard: dbRoom.whiteboard || [],
        spreadsheet: dbRoom.spreadsheet || Array(100).fill().map(() => Array(26).fill('')),
        spreadsheetConfig: dbRoom.spreadsheetConfig || {},
        slides: dbRoom.slides || [{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }],
        chat: dbRoom.chat || [],
        settings: dbRoom.settings || { name: name || 'New Workspace' },
        files: dbRoom.files || [
          { id: 'file-doc-default', name: 'Getting Started.docx', type: 'document', folderId: null, content: null, comments: [], versions: [], lastModified: new Date().toISOString() },
          { id: 'file-sheet-default', name: 'Project Budget.xlsx', type: 'spreadsheet', folderId: null, content: Array(100).fill().map(() => Array(26).fill('')), config: {}, lastModified: new Date().toISOString() },
          { id: 'file-slide-default', name: 'Pitch Slide.pptx', type: 'presentation', folderId: null, content: [{ title: 'Click to add title', content: 'Click to add text', notes: '', elements: [], layout: 'title' }], lastModified: new Date().toISOString() }
        ],
        calendar: dbRoom.calendar || [],
        tasks: dbRoom.tasks || []
      };
      socket.emit('room-created', { roomId });
    } catch (err) {
      console.error('Room creation error:', err);
      socket.emit('room-create-error', { error: err.message });
    }
  });

  // 3. Document (Quill Delta) edits (scoped to workspace file)
  socket.on('file-content-update', ({ roomId, fileId, content }) => {
    if (roomsCache[roomId] && roomsCache[roomId].files) {
      const file = roomsCache[roomId].files.find(f => f.id === fileId);
      if (file) {
        file.content = content;
        file.lastModified = new Date().toISOString();
        dirtyRooms.add(roomId);
      }
    }
    socket.to(roomId).emit('receive-file-content-update', { fileId, content });
  });

  socket.on('file-metadata-update', ({ roomId, fileId, key, value }) => {
    if (roomsCache[roomId] && roomsCache[roomId].files) {
      const file = roomsCache[roomId].files.find(f => f.id === fileId);
      if (file) {
        file[key] = value;
        file.lastModified = new Date().toISOString();
        dirtyRooms.add(roomId);
      }
    }
    socket.to(roomId).emit('receive-file-metadata-update', { fileId, key, value });
  });

  // Keep legacy drawing/sheet events as fallbacks
  socket.on('send-changes', ({ roomId, text }) => {
    socket.to(roomId).emit('receive-changes', text);
  });

  socket.on('save-document', ({ roomId, data }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].document = data;
      dirtyRooms.add(roomId);
    }
  });

  // Whiteboard drawing & clear
  socket.on('draw-line', ({ roomId, startX, startY, endX, endY, color, size }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].whiteboard.push({ startX, startY, endX, endY, color, size });
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-draw-line', { startX, startY, endX, endY, color, size });
  });

  socket.on('clear-board', (roomId) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].whiteboard = [];
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-clear-board');
  });

  // Spreadsheet cell updates
  socket.on('update-spreadsheet', ({ roomId, row, col, value }) => {
    if (roomsCache[roomId]) {
      if (!roomsCache[roomId].spreadsheet) {
        roomsCache[roomId].spreadsheet = Array(15).fill().map(() => Array(8).fill(''));
      }
      roomsCache[roomId].spreadsheet[row][col] = value;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-spreadsheet', { row, col, value });
  });

  // Slides updates & additions
  socket.on('update-slide', ({ roomId, slideIndex, field, value }) => {
    if (roomsCache[roomId]) {
      if (!roomsCache[roomId].slides) roomsCache[roomId].slides = [];
      if (!roomsCache[roomId].slides[slideIndex]) {
        roomsCache[roomId].slides[slideIndex] = { title: '', content: '', notes: '' };
      }
      roomsCache[roomId].slides[slideIndex][field] = value;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-slide-update', { slideIndex, field, value });
  });

  socket.on('change-slide', ({ roomId, slideIndex }) => {
    socket.to(roomId).emit('receive-slide-change', { slideIndex });
  });

  socket.on('update-slides-list', ({ roomId, slides }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].slides = slides;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-slides-list', slides);
  });

  // 6. Chat messages (appended & stored up to 200)
  socket.on('send-message', ({ roomId, message, user }) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgObj = { message, user, timestamp };
    
    if (roomsCache[roomId]) {
      if (!roomsCache[roomId].chat) roomsCache[roomId].chat = [];
      roomsCache[roomId].chat.push(msgObj);
      if (roomsCache[roomId].chat.length > 200) {
        roomsCache[roomId].chat.shift();
      }
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-message', msgObj);
  });

  // 7. Cursor & Cell Relays
  socket.on('cursor-move', ({ roomId, range, user, color }) => {
    socket.to(roomId).emit('receive-cursor', { range, user, color });
  });

  socket.on('whiteboard-cursor-move', ({ roomId, x, y, user, color }) => {
    socket.to(roomId).emit('receive-whiteboard-cursor', { socketId: socket.id, x, y, user, color });
  });

  socket.on('spreadsheet-cell-move', ({ roomId, row, col, user, color }) => {
    socket.to(roomId).emit('receive-spreadsheet-cell', { socketId: socket.id, row, col, user, color });
  });

  // 8. Presence activeApp switch
  socket.on('update-active-app', ({ roomId, activeApp, activeFileId, activeFileTitle }) => {
    if (roomUsers[roomId]) {
      const u = roomUsers[roomId].find(usr => usr.socketId === socket.id);
      if (u) {
        u.activeApp = activeApp;
        u.activeFileId = activeFileId || null;
        u.activeFileTitle = activeFileTitle || null;
        io.to(roomId).emit('active-users', roomUsers[roomId]);
      }
    }
  });

  // 9. WebRTC Screen Sharing & Signaling
  socket.on('start-screen-share', ({ roomId, user, color }) => {
    const room = roomsCache[roomId];
    const settings = room ? (room.settings || {}) : {};
    const shareAllowed = settings.screenShareAllowed || 'everyone';
    
    const users = roomUsers[roomId] || [];
    const isHost = users[0] && users[0].socketId === socket.id;
    
    if (shareAllowed === 'host' && !isHost) {
      socket.emit('screen-share-error', 'Only the host is allowed to present screen.');
      return;
    }

    if (roomPresenters[roomId]) {
      const prevPresenter = roomPresenters[roomId];
      io.to(roomId).emit('screen-share-ended', { presenterSocketId: prevPresenter.socketId });
    }

    roomPresenters[roomId] = { socketId: socket.id, user, color };
    
    if (roomUsers[roomId]) {
      const u = roomUsers[roomId].find(usr => usr.socketId === socket.id);
      if (u) u.activeApp = 'presenting';
      io.to(roomId).emit('active-users', roomUsers[roomId]);
    }

    io.to(roomId).emit('screen-share-started', { 
      presenterSocketId: socket.id, 
      user, 
      color 
    });
  });

  socket.on('stop-screen-share', ({ roomId }) => {
    if (roomPresenters[roomId] && roomPresenters[roomId].socketId === socket.id) {
      delete roomPresenters[roomId];
      
      if (roomUsers[roomId]) {
        const u = roomUsers[roomId].find(usr => usr.socketId === socket.id);
        if (u) u.activeApp = 'docs';
        io.to(roomId).emit('active-users', roomUsers[roomId]);
      }

      io.to(roomId).emit('screen-share-ended', { presenterSocketId: socket.id });
    }
  });

  socket.on('host-stop-screen-share', ({ roomId, presenterSocketId }) => {
    const users = roomUsers[roomId] || [];
    const isHost = users[0] && users[0].socketId === socket.id;
    
    if (isHost && roomPresenters[roomId] && roomPresenters[roomId].socketId === presenterSocketId) {
      delete roomPresenters[roomId];
      
      if (roomUsers[roomId]) {
        const u = roomUsers[roomId].find(usr => usr.socketId === presenterSocketId);
        if (u) u.activeApp = 'docs';
        io.to(roomId).emit('active-users', roomUsers[roomId]);
      }

      io.to(roomId).emit('screen-share-ended', { presenterSocketId: presenterSocketId, forced: true });
    }
  });

  socket.on('update-room-settings', ({ roomId, settings }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].settings = {
        ...roomsCache[roomId].settings,
        ...settings
      };
      dirtyRooms.add(roomId);
      io.to(roomId).emit('receive-room-settings', roomsCache[roomId].settings);
    }
  });

  socket.on('watch-screen', ({ roomId, presenterSocketId }) => {
    if (roomUsers[roomId]) {
      const u = roomUsers[roomId].find(usr => usr.socketId === socket.id);
      if (u && u.activeApp !== 'presenting') {
        u.activeApp = 'watching';
        io.to(roomId).emit('active-users', roomUsers[roomId]);
      }
    }
    io.to(presenterSocketId).emit('user-joined-presenter', { 
      viewerSocketId: socket.id, 
      viewerName: socket.id 
    });
  });

  socket.on('offer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('offer', { 
      senderSocketId: socket.id, 
      sdp 
    });
  });

  socket.on('answer', ({ targetSocketId, sdp }) => {
    io.to(targetSocketId).emit('answer', { 
      senderSocketId: socket.id, 
      sdp 
    });
  });

  socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('ice-candidate', { 
      senderSocketId: socket.id, 
      candidate 
    });
  });

  // 10. Workspace Files persistence
  socket.on('update-files', ({ roomId, files }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].files = files;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-files', files);
  });

  // 11. Workspace Calendar persistence
  socket.on('update-calendar', ({ roomId, calendar }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].calendar = calendar;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-calendar', calendar);
  });

  // 12. Workspace Tasks (Kanban cards) persistence
  socket.on('update-tasks', ({ roomId, tasks }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].tasks = tasks;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-tasks', tasks);
  });

  // 13. Spreadsheet Config updates
  socket.on('update-spreadsheet-config', ({ roomId, config }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].spreadsheetConfig = config;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-spreadsheet-config', config);
  });

  // 14. Document Comments & History updates
  socket.on('update-document-comments', ({ roomId, comments }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].documentComments = comments;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-document-comments', comments);
  });

  socket.on('update-document-versions', ({ roomId, versions }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].documentVersions = versions;
      dirtyRooms.add(roomId);
    }
    socket.to(roomId).emit('receive-document-versions', versions);
  });

  // 15. Real-Time Video Meeting signaling (WebRTC Mesh)
  socket.on('meeting-join', ({ roomId, participant }) => {
    socket.to(roomId).emit('receive-meeting-join', participant);
  });

  socket.on('meeting-leave', ({ roomId, socketId }) => {
    socket.to(roomId).emit('receive-meeting-leave', socketId);
  });

  socket.on('meeting-signal', ({ roomId, targetSocketId, signal }) => {
    io.to(targetSocketId).emit('receive-meeting-signal', {
      senderSocketId: socket.id,
      signal
    });
  });

  socket.on('meeting-state-change', ({ roomId, state }) => {
    socket.to(roomId).emit('receive-meeting-state-change', {
      socketId: socket.id,
      state
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up active presenter if they disconnect
    for (const roomId in roomPresenters) {
      if (roomPresenters[roomId].socketId === socket.id) {
        delete roomPresenters[roomId];
        io.to(roomId).emit('screen-share-ended', { presenterSocketId: socket.id });
      }
    }

    // Remove user from the presence list and update others
    for (const roomId in roomUsers) {
      const initialLength = roomUsers[roomId].length;
      roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id);
      
      if (roomUsers[roomId].length < initialLength) {
        io.to(roomId).emit('active-users', roomUsers[roomId]); // Send updated list
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});