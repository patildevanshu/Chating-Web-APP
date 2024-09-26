require("dotenv").config();

const express = require("express");
const app = express();
const http = require("http").Server(app);
const mongoose = require("mongoose");

const userRouter = require('./routes/userRoute');
const User = require('./models/user');

mongoose.connect('mongodb://127.0.0.1:27017/chating-web-app')

const io = require('socket.io')(http);

// user routes 
app.use('/' ,userRouter);

var usp = io.of('/users-namespace');

usp.on('connection', async function(socket) {
  console.log('user connected');
  var userid =  socket.handshake.auth.token;

  await User.findByIdAndUpdate({ _id : userid }, { $set : {is_online : '1'}});

  socket.on('disconnect', async function(){
    console.log('user disconnected');
    var userid =  socket.handshake.auth.token;

    await User.findByIdAndUpdate({ _id : userid }, { $set : {is_online : '0'}});
  })

});

http.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

