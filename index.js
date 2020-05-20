var express = require('express')
    ,path   = require('path')
    ,cookieParser = require('cookie-parser')
    ,csrf = require('csurf')
    ,session = require('express-session')
    ,multer = require('multer')
    ,bodyParser = require('body-parser')
    ,helpers = require('./modules/helpers.js')
    ,flash = require('connect-flash')
    ,mysqli = require('./modules/databaseConn.js')
    ,pug = require('pug');


// create express app
var app = express();
app.use(express.static(path.join(__dirname, 'public')));


//file systems
var fs = require('fs');


//set template engine
app.set('views', './views');
app.set('view engine', 'pug');

// setup route middlewares
var csrfProtection = csrf({ cookie: true });


//for encryption
var bcrypt = require('bcrypt');


//set session
app.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));


//function to check authentication
function authChecker(req, res, next) {
  if (req.session.loggedin == true) {
    next();
  } else {
    req.flash('warning', 'You are not Authorized to view this page! Please Log in');
    res.redirect("/");
  }
}

//set flash messages
app.use(flash());


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
  mysqli.connection.query('SELECT * FROM file ORDER BY img_id DESC LIMIT 6', function (err, results, fields){

    if(err){
      throw err
    }
    else{
      
      res.render('index',{images: results})
    }
    
  })
});


// //user reg
// app.get('/reg', function(req, res){
//   var userName = 'Abidainv'
//   var userPass = 'abida@2020'
//   var email = 'abidainvestment@gmail.com'
//   bcrypt.hash(userPass, 10, function(err, hash) {
//     mysqli.connection.query('INSERT INTO users VALUES ("", "'+userName+'", "'+hash+'", "'+ email+'", "NOW()")', function(err, results, fields){
//       console.log(results)
//     })
//   });
// });

//rendering login
app.get('/login', csrfProtection, function (req, res) {
  
  res.render('login');
})

//logout route
app.get('/logout', csrfProtection, authChecker, function (req, res, next) {
  req.session.loggedin = false;
  req.flash('danger', 'logout successfully');
  res.redirect('/');

});

//login Datashboard
app.post('/auth', function (req, res){
  var email = req.body.email;
  var password = req.body.password;
  mysqli.connection.query('SELECT * FROM users WHERE email = ?', [email], function (error, results, fields) {
    if (results.length > 0) {
      bcrypt.compare(password, results[0].password, function (err, result) {
        if (result == true) {
          req.session.loggedin = true;
          req.session.email = email;
          req.flash('success', 'Welcome ')
          res.redirect('/upload');
        } else {
          req.flash('warning', 'Username and/ or password are incorrect')
          res.redirect('/login');
        }
      })
      
    } 
    else {

      req.flash('warning', 'Details not Found! Please Contact your Admin for registration')
      res.redirect('/login')
    }
  })
})

app.get('/upload', csrfProtection,authChecker, function (req , res){

  mysqli.connection.query('SELECT * FROM file ORDER BY created_at DESC', function (err, results, fields){

    if(err){
      throw err
    }
    else{
      
      res.render('upload',{images: results})
    }
    
  })
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

       mysqli.connection.query('INSERT INTO file (image_name, image_size) VALUES ("'+req.file.filename+'", "'+req.file.size+'")', function (err, results, fields){
        console.log(results)
        req.flash('alert-success', 'Image uploaded successfully')
        res.redirect('/upload')

  });
  });
  
});

//detele image data
app.post('/delete/:id/:name', function(req, res){

  var path = __dirname + '/public/'+ req.params.name;
  var id = req.params.id;

  fs.unlink(path,function(err){
    if(err) return console.log(err);
    req.flash('success', 'Image deleted!')
  });  
  mysqli.connection.query('DELETE FROM file WHERE img_id = ?',[id], function(err, results, fields){
    res.redirect('/upload')
  })

})

app.listen('8000', function(req, res){
    console.log('server is listening to port .....8000');
});