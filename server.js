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

// --- REAL-TIME & DATABASE LOGIC ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // 1. When a user joins a room
  socket.on('join-room', async (roomId) => {
    socket.join(roomId);
    
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

  // 4. NEW: Sync Chat Messages (Sidebar chat)
  socket.on('send-message', ({ roomId, message, user }) => {
    socket.to(roomId).emit('receive-message', {
      message,
      user,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // 5. Auto-save: Listen for the auto-save event from the frontend
  socket.on('save-document', async ({ roomId, data }) => {
    await Document.findByIdAndUpdate(roomId, { data });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});