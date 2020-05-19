var express = require('express')
    ,path   = require('path')
    ,cookieParser = require('cookie-parser')
    ,csrf = require('csurf')
    ,session = require('express-session')
    ,multer = require('multer')
    ,bodyParser = require('body-parser')
    ,helpers = require('./modules/helpers.js')
    ,mysqli = require('./modules/databaseConn.js')
    ,pug = require('pug')
    ,flash = require('connect-flash');
// create express app
var app = express();
app.use(express.static(path.join(__dirname, 'public')));

//set template engine
app.set('views', './views');
app.set('view engine', 'pug');

// setup route middlewares
var csrfProtection = csrf({ cookie: true });

//message
app.use(flash());
//set session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));


//bodyparser middleware
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

// we need this because "cookie" is true in csrfProtection
app.use(cookieParser());


// parse cookies
// we need this because "cookie" is true in csrfProtection
app.use(cookieParser());


//localstorage
let storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, __dirname + '/public');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

//route index
app.get('/', csrfProtection, function (req, res) {
  // pass the csrfToken to the view
  mysqli.connection.query('SELECT * FROM file', function (err, results, fields){

    if(err){
      throw err
    }
    else{
      
      res.render('index',{images: results})
    }
    
  })

});

app.get('/upload', csrfProtection, function (req , res){
  res.render(('upload'), {
    csrfToken: req.csrfToken()
  });
})

//test images if received
app.post('/uploads', (req, res) => {
  // 'img' is the name of our file input field in the HTML form
  let upload = multer({ storage: storage, fileFilter: helpers.imageFilter }).single('img');

  upload(req, res, function(err) {
      // req.file contains information of uploaded file
      // req.body contains information of text fields, if there were any

      if (req.fileValidationError) {
          return res.send(req.fileValidationError);
      }
      else if (!req.file) {
          return res.send('Please select an image to upload');
      }
      else if (err instanceof multer.MulterError) {
          return res.send(err);
      }
      else if (err) {
          return res.send(err);
      }

      mysqli.connection.query('INSERT INTO file (image_name, image_size) VALUES ("'+req.file.filename+'", "'+req.file.size+'")', function (err, fields, results){
    
        req.flash('alert-success', 'Image uploaded successfully')
        res.redirect('/')

  });
  });
  
});

//fetch images

app.listen('8000', function(req, res){
    console.log('server is listening to port .....8000');
});