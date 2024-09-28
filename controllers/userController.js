const User = require('../models/user');
const Chat = require('../models/chat.js');
const bcrypt = require('bcrypt');



const registerLoad = async(req , res , next) =>{
    
    try {
        res.render('register');
    } catch (error) {
        console.error(error.message);
    }

};
const register = async(req , res , next) =>{

    try {
        const passwordHash = await bcrypt.hash(req.body.password , 10);
        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            image: 'images/'+req.file.filename,
            password: passwordHash,
            mobile: req.body.mobile
        });
        await newUser.save();

        res.render('login', {message: 'User saved successfully'});

    } catch (error) {
        console.error(error.message);
    }

};

const loginLoad = async(req , res , next) =>{
    try {
        res.render('login');
    } catch (error) {
        console.error(error.message);
    }
};

const login = async(req , res , next) =>{
    try {
        
        const email = req.body.email;
        const password = req.body.password;

        const user = await User.findOne({email});
        if (user) {
            
            const passMatch =  await bcrypt.compare(password, user.password);
            // console.log(passMatch);
            if (passMatch) {
                // req.session.isLoggedIn = true;
                req.session.user = user;
                res.redirect('/dashboard');
                
                //res.render('dashboard', {user});
            } else {
                res.render('login', {message: 'password mismatch'});
            }

        } else {
            res.render('login', {message: 'user not found'});
        }

    } catch (error) {
        console.error(error.message);
    }
};

const logout = async(req , res , next) =>{
    try {
        
        req.session.destroy();
        res.redirect('/');

    } catch (error) {
        console.error(error.message);
    }
};

const loadDashboard = async(req , res , next) =>{
    try {
        let users = await User.find({ _id: {$nin:[req.session.user._id]}});
        res.render('dashboard' , { user: req.session.user , users: users });
    } catch (error) {
        console.error(error.message);
    }
};

const saveChat = async(req , res , next) =>{
    try {
        var newChat = new Chat({
            sender_id: req.body.sender_id,
            receiver_id: req.body.receiver_id,
            message: req.body.message
        });
        var chat = await newChat.save();
        console.log(chat);
        res.status(200).send({success:true , msg:'chat saved successfully' , data:chat });

        }catch (error) {
            res.status(400).send({success:false , msg:error.message});
            return;
        }
        
};

const deleteChat = async function(req,res , next){
    try {
        await Chat.deleteOne({_id:req.body.id});
            res.status(200).send({success:true, msg: 'Chat deleted successfully'});
        
    } catch (error) {
        res.status(400).send({success:false, msg: error.message});
        return;
    }
}



module.exports = {
    registerLoad,
    register , 
    loginLoad,
    login,
    logout,
    loadDashboard,
    saveChat, 
    deleteChat
}