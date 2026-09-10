const User = require('../models/user');
const Chat = require('../models/chat');
const bcrypt = require('bcrypt');

const registerLoad = async (req, res, next) => {
    try {
        res.render('register');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const register = async (req, res, next) => {
    try {
        const { name, email, password, mobile } = req.body;

        if (!name || !email || !password || !mobile) {
            return res.render('register', { message: 'All fields are required' });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('register', { message: 'Email is already registered' });
        }

        let imagePath = 'images/default-avatar.svg';
        if (req.file && req.file.filename) {
            imagePath = 'images/' + req.file.filename;
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            image: imagePath,
            password: passwordHash,
            mobile
        });
        await newUser.save();

        res.render('register', { message: 'User registered successfully! Please login.' });
    } catch (error) {
        console.error('Register error:', error.message);
        res.render('register', { message: 'Registration failed: ' + error.message });
    }
};

const loginLoad = async (req, res, next) => {
    try {
        res.render('login');
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Internal Server Error');
    }
};

const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (user) {
            const passMatch = await bcrypt.compare(password, user.password);
            if (passMatch) {
                req.session.user = user;
                return res.redirect('/dashboard');
            } else {
                return res.render('login', { message: 'Invalid email or password' });
            }
        } else {
            return res.render('login', { message: 'User not found' });
        }
    } catch (error) {
        console.error('Login error:', error.message);
        res.render('login', { message: 'An error occurred during login' });
    }
};

const logout = async (req, res, next) => {
    try {
        req.session.destroy(() => {
            res.redirect('/');
        });
    } catch (error) {
        console.error('Logout error:', error.message);
        res.redirect('/');
    }
};

const loadDashboard = async (req, res, next) => {
    try {
        if (!req.session.user) {
            return res.redirect('/');
        }
        const currentUser = await User.findById(req.session.user._id);
        const users = await User.find({ _id: { $nin: [req.session.user._id] } });
        res.render('dashboard', { user: currentUser || req.session.user, users: users });
    } catch (error) {
        console.error('loadDashboard error:', error.message);
        res.redirect('/');
    }
};

const saveChat = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).send({ success: false, msg: 'Unauthorized' });
        }

        const { receiver_id, message, iv } = req.body;
        const sender_id = req.session.user._id;

        if (!receiver_id || !message) {
            return res.status(400).send({ success: false, msg: 'Missing receiver_id or message' });
        }

        const newChat = new Chat({
            sender_id,
            receiver_id,
            message,
            iv: iv || ''
        });

        const savedChat = await newChat.save();
        return res.status(200).send({ success: true, msg: 'Chat saved successfully', data: savedChat });
    } catch (error) {
        console.error('saveChat error:', error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

const deleteChat = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).send({ success: false, msg: 'Unauthorized' });
        }

        const { id } = req.body;
        if (!id) {
            return res.status(400).send({ success: false, msg: 'Message ID is required' });
        }

        await Chat.deleteOne({ _id: id, sender_id: req.session.user._id });
        return res.status(200).send({ success: true, msg: 'Chat deleted successfully' });
    } catch (error) {
        console.error('deleteChat error:', error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

const savePublicKey = async (req, res, next) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).send({ success: false, msg: 'Unauthorized' });
        }

        const { publicKey } = req.body;
        if (!publicKey) {
            return res.status(400).send({ success: false, msg: 'publicKey is required' });
        }

        await User.findByIdAndUpdate(req.session.user._id, { $set: { publicKey: publicKey } });
        req.session.user.publicKey = publicKey;

        return res.status(200).send({ success: true, msg: 'Public key saved' });
    } catch (error) {
        console.error('savePublicKey error:', error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

const getPublicKey = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select('publicKey name email');
        if (!user) {
            return res.status(404).send({ success: false, msg: 'User not found' });
        }
        return res.status(200).send({ success: true, publicKey: user.publicKey });
    } catch (error) {
        console.error('getPublicKey error:', error.message);
        return res.status(500).send({ success: false, msg: error.message });
    }
};

// Next.js REST API endpoints
const apiLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, msg: 'Email and password are required' });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, msg: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, msg: 'Invalid email or password' });
        }
        req.session.user = user;
        const userObj = {
            _id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            mobile: user.mobile,
            publicKey: user.publicKey
        };
        return res.status(200).json({ success: true, user: userObj });
    } catch (error) {
        console.error('apiLogin error:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

const apiRegister = async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;
        if (!name || !email || !password || !mobile) {
            return res.status(400).json({ success: false, msg: 'All fields are required' });
        }
        const existing = await User.findOne({ email });
        if (existing) {
            return res.status(400).json({ success: false, msg: 'Email is already registered' });
        }
        let imagePath = 'images/default-avatar.svg';
        if (req.file && req.file.filename) {
            imagePath = 'images/' + req.file.filename;
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            email,
            image: imagePath,
            password: passwordHash,
            mobile
        });
        const savedUser = await newUser.save();
        req.session.user = savedUser;
        const userObj = {
            _id: savedUser._id,
            name: savedUser.name,
            email: savedUser.email,
            image: savedUser.image,
            mobile: savedUser.mobile,
            publicKey: savedUser.publicKey
        };
        return res.status(201).json({ success: true, user: userObj });
    } catch (error) {
        console.error('apiRegister error:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

const apiMe = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(200).json({ success: false, user: null });
        }
        const user = await User.findById(req.session.user._id).select('-password');
        if (!user) {
            return res.status(200).json({ success: false, user: null });
        }
        return res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('apiMe error:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

const apiUsers = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, msg: 'Unauthorized' });
        }
        const users = await User.find({ _id: { $nin: [req.session.user._id] } })
            .select('_id name email image is_online publicKey')
            .sort({ is_online: -1, name: 1 });
        return res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('apiUsers error:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

const apiLogout = async (req, res) => {
    try {
        req.session.destroy(() => {
            res.status(200).json({ success: true, msg: 'Logged out successfully' });
        });
    } catch (error) {
        console.error('apiLogout error:', error);
        return res.status(500).json({ success: false, msg: error.message });
    }
};

const apiGetChats = async (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.status(401).json({ success: false, msg: 'Unauthorized' });
        }
        const { receiverId } = req.params;
        const senderId = req.session.user._id;

        const chats = await Chat.find({
            $or: [
                { sender_id: senderId, receiver_id: receiverId },
                { sender_id: receiverId, receiver_id: senderId }
            ]
        }).sort({ createdAt: 1 });

        return res.status(200).json({ success: true, chats });
    } catch (err) {
        console.error('apiGetChats error:', err);
        return res.status(500).json({ success: false, msg: err.message });
    }
};

module.exports = {
    registerLoad,
    register,
    loginLoad,
    login,
    logout,
    loadDashboard,
    saveChat,
    deleteChat,
    savePublicKey,
    getPublicKey,
    apiLogin,
    apiRegister,
    apiMe,
    apiUsers,
    apiLogout,
    apiGetChats
};