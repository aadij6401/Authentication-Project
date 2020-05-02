var express=require('express');
var app=express();
var path=require('path');
var bodyParser=require('body-parser');
var dotenv=require('dotenv');
var mongoose=require('mongoose');
//Modules for Passport Library...
var passport=require('passport');
var LocalStrategy=require('passport-local').Strategy;
//
var flash=require('connect-flash');
//Module for express session as well as for the passport.
var session=require('express-session');

var userRoutes=require('./routes/users');
var User=require('./models/usermodel');

//Setting up configuration file for Port and Database Connection..
dotenv.config({path:'./config.env'});

//Connecting Local Mongoose Database on the system...
//Connecting to online database using mongodb atlas..(Use The Password of the cluster not the account password.) 
mongoose.connect("mongodb+srv://Admin-atishay:aadijain1@cluster0-0rooc.mongodb.net/test?retryWrites=true&w=majority",{
	useNewUrlParser:true,
	useUnifiedTopology:true,
	useCreateIndex:true
});

//MiddleWare for Session..
app.use(session({
   secret:'Simple Login application.',
   resave:true,
   saveUninitialized:true
}));

//Setting up middleware for Passport

app.use(passport.initialize());
app.use(passport.session());
//Passport will use a local stragegy in which we have passed a Function named authenticate() which is a part of the passport module 
passport.use(new LocalStrategy({usernameField:'email'} ,User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Middleware for flash messages.
app.use(flash());

//Setting up global variables for flash messages...
app.use((req,res,next)=>{
  res.locals.success_msg=req.flash(('success_msg'));
  res.locals.error_msg=req.flash(('error_msg'));
  res.locals.error=req.flash(('error'));
  res.locals.currentUser=req.user;
  next();
});

app.use(bodyParser.urlencoded({extended:true}));

app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.static('public'));
app.use(userRoutes);

// app.listen(process.env.PORT,(req,res)=>{
   
//      console.log("Server is started..");
   
// });   

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;

}
app.listen(port,(req,res)=>{
  console.log("Server is started.");
});
