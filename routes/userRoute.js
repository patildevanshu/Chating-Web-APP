const express = require("express");
const app = express();
const path = require("path");
const multer = require("multer");
const userController = require("../controllers/userController");

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

app.get('/register' , userController.registerLoad);
app.post('/register' , upload.single('image') , userController.register );

module.exports = app;