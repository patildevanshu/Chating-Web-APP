const User = require('../models/user');
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

        res.render('register', {message: 'User saved successfully'});

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



module.exports = {
    registerLoad,
    register , 
    loginLoad,
    login,
    logout,
    loadDashboard
}