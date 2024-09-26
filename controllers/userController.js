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

module.exports = {
    registerLoad,
    register
}