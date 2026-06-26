const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// --- DATABASE SETUP ---
// REPLACE THIS STRING WITH YOUR MONGODB ATLAS CONNECTION STRING
const MONGO_URI = 'mongodb+srv://collaborate:collaborate@cluster0.lsqk5i9.mongodb.net/?appName=Cluster0';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB!'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// Define what a "Document" looks like in the database
const DocumentSchema = new mongoose.Schema({
  _id: String, // We will use the Room ID as the database ID
  data: Object // This will store the Quill rich text data (Deltas)
});
const Document = mongoose.model('Document', DocumentSchema);

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

// NEW: Object to keep track of users in each room
const roomUsers = {};

// --- REAL-TIME & DATABASE LOGIC ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 1. When a user joins a room (UPDATED to accept user data)
  socket.on('join-room', async ({ roomId, user, imageUrl }) => {
    socket.join(roomId);
    
    // Track the user for the presence avatars
    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId] = roomUsers[roomId].filter(u => u.socketId !== socket.id); // Remove dupes
    roomUsers[roomId].push({ socketId: socket.id, user, imageUrl });
    
    // Broadcast the active users to everyone in this room
    io.to(roomId).emit('active-users', roomUsers[roomId]);

    // Check the database: Does this document already exist?
    let document = await Document.findById(roomId);
    
    // If it doesn't exist, create a blank one
    if (!document) {
      document = await Document.create({ _id: roomId, data: "" });
    }

    // Send the saved document back to the user who just joined
    socket.emit('load-document', document.data);
  });

  // 2. When a user types something
  socket.on('send-changes', ({ roomId, text }) => {
    // Broadcast changes to everyone else in the room
    socket.to(roomId).emit('receive-changes', text);
  });

  // 3. NEW: Sync Cursor Movements (Figma style)
  // Added 'color' to support unique cursor colors
  socket.on('cursor-move', ({ roomId, range, user, color }) => {
    socket.to(roomId).emit('receive-cursor', { range, user, color });
  });

  socket.on('update-spreadsheet', ({ roomId , row , col , value }) => {
    socket.to(roomId).emit('receive-spreadsheet', { row , col , value });
  });

  socket.on('update-slide' , ({ roomId , slideIndex , field , value }) => {
    socket.to(roomId).emit('receive-slide-update' , { slideIndex , field , value });
  });

  socket.on('change-slide' , ({ roomId , slideIndex }) => {
    socket.to(roomId).emit('receive-slide-change' , { slideIndex });
  });

  // 4. NEW: Sync Chat Messages (Sidebar chat)
  socket.on('send-message', ({ roomId, message, user }) => {
    socket.to(roomId).emit('receive-message', {
      message,
      user,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  socket.on('draw-line', ({ roomId, startX, startY, endX, endY, color }) => {
    socket.to(roomId).emit('receive-draw-line', { startX, startY, endX, endY, color });
  });

  socket.on('clear-board',(roomId) =>  {
    socket.to(roomId).emit('receive-clear-board');
  })

  // 5. Auto-save: Listen for the auto-save event from the frontend
  socket.on('save-document', async ({ roomId, data }) => {
    await Document.findByIdAndUpdate(roomId, { data });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // NEW: Remove user from the presence list and update others
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