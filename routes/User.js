const {Router}=require('express');
const User = require('../models/User');
const { GoogleLogin } = require('../controller/Auth');
const UserRoute=Router();

UserRoute.get('/',(req,res ) => {
  return res.send("Welcome to home page");
}
)
UserRoute.post('/signup', async(req,res ) => {
    let user;
  const {name, email, password}=req.body;
   user=await User.findOne({email});
  if(user){
    return res.json({message:"User already exist please login"},);

  }
  user= await User.create({name ,email,password});
  return user; 
}
)

UserRoute.get('/googleauth', GoogleLogin);


module.exports=UserRoute;