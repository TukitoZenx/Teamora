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
      socket.emit('load-room', roomsCache[roomId]);
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

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
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