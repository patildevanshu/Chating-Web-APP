require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http").Server(app);
const mongoose = require("mongoose");

const userRouter = require('./routes/userRoute');
const User = require('./models/user');
const Chat = require('./models/chat');

app.use(cors(
  {
      origin: ["https://chating-web-app.vercel.app"],
      methods: ["POST", "GET"],
      credentials: true
  }
));
app.use(express.json())

mongoose.connect('mongodb+srv://devanshupatil34:wQGVb1VxlnALXzaq@cluster0.z4hcv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')

const io = require('socket.io')(http);

// user routes 
app.use('/' ,userRouter);

var usp = io.of('/users-namespace');

usp.on('connection', async function(socket) {
  console.log('user connected');
  var userid =  socket.handshake.auth.token;
  console.log(userid);

  // user broadcast online status
  socket.broadcast.emit('getOnlineUser' , {user_id: userid});


  await User.findByIdAndUpdate({ _id : userid }, { $set : {is_online : '1'}});

  socket.on('disconnect', async function(){
    console.log('user disconnected');
    var userid =  socket.handshake.auth.token;

    await User.findByIdAndUpdate({ _id : userid }, { $set : {is_online : '0'}});

    // user broadcast offline status
  socket.broadcast.emit('getOfflineUser' , {user_id: userid});

  });

  // chating implementation
  socket.on('newChat', function(data){
    socket.broadcast.emit('loadNewChat', data);
  })

  // load old chats
  socket.on('existsChat', async function(data){
    var chatData = await Chat.find({ $or: [ { sender_id: data.sender_id, receiver_id: data.receiver_id }, { sender_id: data.receiver_id, receiver_id: data.sender_id } ] });
    socket.emit('loadChats', {chats:chatData});
  });

  // delete chat
    socket.on('chatDeleted', function(data){
      socket.broadcast.emit('chatMessageDeleted', data);
    });

});


http.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

