const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const userController = require("../controllers/userController");
const session = require('express-session')
const { SESSION_SECRET } = process.env;
const auth = require('../middlewares/auth');

app.use(session({
    secret: SESSION_SECRET || 'thisissessionsecret',
    resave: false,
    saveUninitialized: false
}));

const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', './views');

app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, path.join(__dirname,'../public/images'));
    },
    filename: function(req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

app.get('/register', auth.isLogout, userController.registerLoad);
app.post('/register', auth.isLogout, upload.single('image'), userController.register);

app.get('/', auth.isLogout, userController.loginLoad);
app.post('/', auth.isLogout, userController.login);
app.get('/logout', auth.isLogin, userController.logout);

app.get('/dashboard', auth.isLogin, userController.loadDashboard);

// Next.js REST API routes
app.post('/api/register', upload.single('image'), userController.apiRegister);
app.post('/api/login', userController.apiLogin);
app.get('/api/me', userController.apiMe);
app.get('/api/users', userController.apiUsers);
app.post('/api/logout', userController.apiLogout);
app.post('/api/save-chat', userController.saveChat);
app.post('/api/delete-chat', userController.deleteChat);
app.post('/api/save-public-key', userController.savePublicKey);
app.get('/api/get-public-key/:userId', userController.getPublicKey);
app.get('/api/chats/:receiverId', userController.apiGetChats);

// Legacy EJS & Chat API routes
app.post('/save-chat', auth.isLogin, userController.saveChat);
app.post('/delete-chat', auth.isLogin, userController.deleteChat);
app.post('/save-public-key', auth.isLogin, userController.savePublicKey);
app.get('/get-public-key/:userId', auth.isLogin, userController.getPublicKey);

app.get('*', function (req, res) {
    if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
        return res.status(404).json({ error: 'Not found' });
    }
    res.redirect('/');
});

module.exports = app;