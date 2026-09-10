const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required: true,
    },
    
    email:{
        type:String,
        required: true,
        unique: true
    },
    image:{
        type:String,
        required: true,
    },
    password:{
        type:String,
        required: true,
    },
    is_online:{
        type:String,
        default: '0',
    },
    mobile:{
        type:Number,
        required: true,
    },
    publicKey:{
        type: Object,
        default: null
    }
},
{ timestamps : true }
);

module.exports = mongoose.model('User' , userSchema);