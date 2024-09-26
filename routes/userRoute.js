const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const userController = require("../controllers/userController");
const session = require('express-session')
const { SESSION_SECRET } = process.env;
const auth = require('../middlewares/auth');

app.use(session({secret: SESSION_SECRET}));

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

app.get('/register' ,auth.isLogout, userController.registerLoad);
app.post('/register' , upload.single('image') , userController.register );

app.get('/', auth.isLogout ,userController.loginLoad);
app.post('/',userController.login);
app.get('/logout', auth.isLogin , userController.logout);

app.get('/dashboard', auth.isLogin , userController.loadDashboard);

app.get('*' , function (req, res) {
    res.redirect('/');
})

module.exports = app;