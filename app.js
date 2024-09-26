require("dotenv").config();

const express = require("express");
const app = express();
const mongoose = require("mongoose");

const userRouter = require('./routes/userRoute');

mongoose.connect('mongodb://127.0.0.1:27017/chating-web-app')

// user routes 
app.use('/' ,userRouter);


app.listen(3000, () => {
    console.log("Server is running on port 3000");
  });

