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
  whiteboard: { type: Array, default: [] }, // strokes [{ startX, startY, endX, endY, color, size }]
  spreadsheet: { type: Array, default: null }, // 2D array of grid cells [[String]]
  slides: { 
    type: Array, 
    default: [{ title: 'Click to add title', content: 'Click to add text', notes: '' }] 
  },
  chat: { type: Array, default: [] }, // messages [{ message, user, timestamp }]
  settings: { type: Object, default: {} }
});
const Room = mongoose.model('Room', RoomSchema);

// --- SERVER SETUP ---
const app = express();
app.use(cors());
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
        whiteboard: cachedRoom.whiteboard,
        spreadsheet: cachedRoom.spreadsheet,
        slides: cachedRoom.slides,
        chat: cachedRoom.chat,
        settings: cachedRoom.settings
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

  // 1. Join Room: Loads complete state from cache/database
  socket.on('join-room', async ({ roomId, user, imageUrl, color, activeApp }) => {
    socket.join(roomId);
    
    // Load from database if not in server cache
    if (!roomsCache[roomId]) {
      try {
        let dbRoom = await Room.findById(roomId);
        if (!dbRoom) {
          const defaultGrid = Array(15).fill().map(() => Array(8).fill(''));
          dbRoom = await Room.create({
            _id: roomId,
            document: null,
            whiteboard: [],
            spreadsheet: defaultGrid,
            slides: [{ title: 'Click to add title', content: 'Click to add text', notes: '' }],
            chat: [],
            settings: {}
          });
        }
        roomsCache[roomId] = {
          document: dbRoom.document,
          whiteboard: dbRoom.whiteboard || [],
          spreadsheet: dbRoom.spreadsheet || Array(15).fill().map(() => Array(8).fill('')),
          slides: dbRoom.slides || [{ title: 'Click to add title', content: 'Click to add text', notes: '' }],
          chat: dbRoom.chat || [],
          settings: dbRoom.settings || {}
        };
      } catch (err) {
        console.error('Error loading room:', err);
      }
    }
    
    // Track user for active-users
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id); // Remove duplicates
    roomUsers[roomId].push({ 
      socketId: socket.id, 
      user, 
      imageUrl, 
      color, 
      activeApp: activeApp || 'docs' 
    });
    
    // Broadcast active users
    io.to(roomId).emit('active-users', roomUsers[roomId]);

    // Send complete saved room state back to user who joined
    if (roomsCache[roomId]) {
      const activePresenter = roomPresenters[roomId] || null;
      socket.emit('load-room', { ...roomsCache[roomId], activePresenter });
    }
  });

  // 2. Document (Quill Delta) edits
  socket.on('send-changes', ({ roomId, text }) => {
    socket.to(roomId).emit('receive-changes', text);
  });

  socket.on('save-document', ({ roomId, data }) => {
    if (roomsCache[roomId]) {
      roomsCache[roomId].document = data;
      dirtyRooms.add(roomId);
    }
  });

  // 3. Whiteboard drawing & clear
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

  // 4. Spreadsheet cell updates
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

  // 5. Slides updates & additions
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
  socket.on('update-active-app', ({ roomId, activeApp }) => {
    if (roomUsers[roomId]) {
      const u = roomUsers[roomId].find(usr => usr.socketId === socket.id);
      if (u) {
        u.activeApp = activeApp;
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