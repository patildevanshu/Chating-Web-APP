require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http").Server(app);
const mongoose = require("mongoose");

const userRouter = require('./routes/userRoute');
const User = require('./models/user');
const Chat = require('./models/chat');

const cors = require('cors');
const path = require('path');

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));

const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/chating-app';
mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB:', mongoURI))
  .catch((err) => console.error('MongoDB connection error:', err.message));

const io = require('socket.io')(http, {
  cors: {
    origin: true,
    credentials: true
  }
});

// user routes 
app.use('/', userRouter);

const usp = io.of('/users-namespace');

usp.on('connection', async function(socket) {
  const userid = socket.handshake.auth ? socket.handshake.auth.token : null;
  console.log('[Socket] Connection attempt. User ID:', userid);

  if (userid && mongoose.Types.ObjectId.isValid(userid)) {
    // Join private room for secure targeted message delivery
    const userRoom = `user_${String(userid)}`;
    socket.join(userRoom);
    console.log('[Socket] Socket', socket.id, 'joined room:', userRoom);

    try {
      await User.findByIdAndUpdate(userid, { $set: { is_online: '1' } });
      socket.broadcast.emit('getOnlineUser', { user_id: String(userid) });
    } catch (err) {
      console.error('Error setting user online:', err.message);
    }
  }

  // Load existing chat history between two users
  socket.on('existsChat', async function(data) {
    try {
      if (!data || !data.sender_id || !data.receiver_id) return;
      console.log('[Socket] existsChat request:', data.sender_id, '<->', data.receiver_id);
      const chats = await Chat.find({
        $or: [
          { sender_id: data.sender_id, receiver_id: data.receiver_id },
          { sender_id: data.receiver_id, receiver_id: data.sender_id }
        ]
      }).sort({ createdAt: 1 });
      socket.emit('loadChats', { chats });
    } catch (err) {
      console.error('Error in existsChat:', err.message);
      socket.emit('loadChats', { chats: [] });
    }
  });

  // Relay new encrypted chat only to recipient's private room
  socket.on('newChat', function(data) {
    if (data && data.receiver_id) {
      const targetRoom = `user_${String(data.receiver_id)}`;
      console.log('[Socket] Relaying newChat to room:', targetRoom);
      usp.to(targetRoom).emit('loadNewChat', data);
    }
  });

  // Relay chat deletion event to recipient's room
  socket.on('chatDeleted', function(data) {
    if (data && data.receiver_id && data.id) {
      const targetRoom = `user_${String(data.receiver_id)}`;
      console.log('[Socket] Relaying chatMessageDeleted to room:', targetRoom);
      usp.to(targetRoom).emit('chatMessageDeleted', data.id);
    }
  });

  socket.on('disconnect', async function() {
    console.log('[Socket] Disconnected:', userid);
    if (userid && mongoose.Types.ObjectId.isValid(userid)) {
      try {
        await User.findByIdAndUpdate(userid, { $set: { is_online: '0' } });
        socket.broadcast.emit('getOfflineUser', { user_id: String(userid) });
      } catch (err) {
        console.error('Error setting user offline:', err.message);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

