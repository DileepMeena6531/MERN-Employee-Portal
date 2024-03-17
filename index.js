require('dotenv').config();

const express=require('express');
const app=express();
const mongoose=require('mongoose');
const Detail=require('./model/detail');
const path=require('path');
const methodOverride = require('method-override')
const ExpressError=require("./ExpressError");
const ejsMate=require("ejs-mate");
const flash=require("connect-flash");
const session=require("express-session");
const passport=require("passport");
const LocalStrategy=require("passport-local");
const User=require("./model/user");
const multer  = require('multer')
const {storage}=require("./cloudConfic");
const upload = multer({ storage }); 

main().then(()=>{
  console.log("mongodb connected"); 
}).catch((err)=>{
  console.log(err);
})
async function main(){
  await mongoose.connect('mongodb://127.0.0.1:27017/employee'); 
}

app.set("views",path.join(__dirname,"views"));
app.set("view engine","ejs");

app.use(express.static(path.join(__dirname,"public")));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride('_method'));
app.engine('ejs',ejsMate);

const sessionOptions={
  secret:"mysupersecretcode",
  resave:false,
  saveUninitialized:true,
  cookie:{
      expires:Date.now()+7*24*60*60*1000,
      maxAge:7*24*60*60*1000,
      httpOnly:true
  }
}

app.use(session(sessionOptions));
app.use(flash());


app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// flash 
app.use((req,res,next)=>{
  res.locals.success=req.flash("success");
  res.locals.error=req.flash("error");
  res.locals.currUser=req.user;
  next();
})

// authentication check
const isLoggedIn=(req,res,next)=>{
  if(!req.isAuthenticated()){
      req.session.redirectUrl=req.originalUrl;
      req.flash("error","you must be loged In to create listing");
      return res.redirect("/login");  
  }
  next();
}
const saveRedirectUrl=(req,res,next)=>{
  if(req.session.redirectUrl){
      res.locals.redirectUrl=req.session.redirectUrl;
  }
  next();
}

//signup route
app.get("/signup",(req,res)=>{
  res.render("signup.ejs");
})

//signup post route
app.post("/signup",wrapAsync(async(req,res)=>{
  try{
  let {username,email,password}=req.body;

  const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash("error", "Email already exists. Please use a different email.");
      return res.redirect("/signup");
    }

  const newUser=new User({username,email});
  const registerUser=await User.register(newUser,password);
  req.login(registerUser,(err)=>{
    if(err){
      return next(err);
    }
    req.flash('success',"welcome back to your page");
    res.redirect("/");
  })

  }
  catch(e){
    req.flash("error",e.message);
    res.redirect("/signup");
  }
}))

//login route
app.get("/login",(req,res)=>{
  res.render("login.ejs");
})

//login post route
app.post("/login",saveRedirectUrl,passport.authenticate('local', { failureRedirect: '/login',failureFlash:true }),async(req,res)=>{
  const redirectUrl=res.locals.redirectUrl || "/";
  req.flash("success","Welcome back to Page");
  res.redirect(redirectUrl);
})

//logout 
app.get("/logout", (req, res, next) => { 
  req.logOut((err) => {
    if (err) {
      return next(err);
    }
    req.flash("success", "You are logged out!");
    res.redirect("/login");
  });
});


//home page route
app.get("/",isLoggedIn,(req,res)=>{
    res.render("home.ejs");
})

//employee route 
 app.get("/employee",isLoggedIn,wrapAsync(async(req,res,next)=>{
    let allDetail=await Detail.find();
    res.render("index.ejs",{allDetail});
 }));

 //create new employee
 app.get("/employee/new",isLoggedIn,(req,res)=>{
    res.render("new.ejs");
 })

 
 app.post("/employee",isLoggedIn,upload.single('img'),wrapAsync(async(req,res,next)=>{
  try{

    let url=req.file.path;
    let filename=req.file.filename;
   let {name,email,mobile_no,designation,gender,course,}=req.body;

   let existingEmployee = await Detail.findOne({ email: email });
    if (existingEmployee) {
      req.flash("error","Email already exist!");
      return res.redirect("/employee/new");
    }

   let newDetail=new Detail({
      name:name,
      email:email,
      mobile_no:mobile_no,
      designation:designation,
      gender:gender,
      course:course
   });
   newDetail.img={url,filename};
   req.flash("success","you create new employee list");
   await newDetail.save();
   res.redirect("/employee"); 
  }
  catch(e){
    req.flash("error",e.message);
    res.redirect("error.ejs");
  }
 }));

 function wrapAsync(fn){
   return function(req,res,next){
      fn(req,res,next).catch((err)=>next(err));
   } ;
}

 //edit route:
 app.get("/employee/:id/edit",isLoggedIn,wrapAsync( async(req,res,next)=>{
   let {id}=req.params;  
   let detail=await Detail.findById(id);
   if(!detail){
    req.flash("error","Listing you requested for does not exist!");
    res.redirect("/");
   } 
    res.render("edit.ejs",{detail});
 }));

 //update route:
 app.put("/employee/:id",isLoggedIn,upload.single('img'),wrapAsync(async(req,res,next)=>{
  try{
   let {id}=req.params;
   let { name, email, mobile_no, designation, gender, course } = req.body;

   // Check if email already exists
   let existingEmployee = await Detail.findOne({ email: email });
   if (existingEmployee && existingEmployee._id.toString() !== id) {
     req.flash("error", "Email already exists");
     return res.redirect("/employee/" + id + "/edit");
   }

   const employeDetail=await Detail.findByIdAndUpdate(id, {
    name: name,
    email: email,
    mobile_no: mobile_no,
    designation: designation,
    gender: gender,
    course: course
  }, { runValidators: true, new: true });

  if(typeof req.file!=="undefined"){
    let url=req.file.path;
    let filename=req.file.filename;
    employeDetail.img={url,filename};
    }

    await employeDetail.save();
   req.flash("success","you edit your employee list");
   res.redirect("/employee"); 
  }
  catch(e){
    req.flash("error",e.message);
    res.redirect("error.ejs");
  }
 }));

 //delete route
 app.delete("/employee/:id",isLoggedIn,wrapAsync(async(req,res,next)=>{  
   let {id}=req.params;
   await Detail.findByIdAndDelete(id);
   req.flash("success","deleted employee detail");
   res.redirect("/employee");
 }));
 
 app.all("*",(req,res,next)=>{
  next(new ExpressError(404,"Page Not Found"));
})

 app.use((err,req,res,next)=>{
   let {status=402,message="something went wrong"}=err;
   res.status(status).render("error.ejs",{message});
 })
 
app.listen(8080,()=>{
    console.log("app is listeninig port 8080");
});