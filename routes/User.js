const {Router}=require('express');
const User = require('../models/User');
const UserRoute=Router();
const {createHmac}=require('crypto');
const {createToken}=require('../utils/auth');

UserRoute.get('/',(req,res ) => {
  return res.send("Welcome to home page");
}
)
UserRoute.post('/signup', async(req,res ) => {
    let user;
  const {name, email, password}=req.body;
   user=await User.findOne({email});
  if(user){
    return res.status(200).json({message:"User already exist please login"},);

  }
  user= await User.create({name ,email,password});
  return res.status(200).json({message:"User created successfully"},); 
}
)

UserRoute.post('/login', async(req,res ) => {
  const {email, password}=req.body;
  if(!email || !password){
    return res.status(500).json({message:"Please provide email and passowrd"})
  }
  const user=await User.findOne({email});
  if(!user){
    return res.status(500).json({message:"User not found."})
  }
  const hashedpassword=createHmac('sha256',user.salt).update(password).digest('hex');
  if(hashedpassword!==user.password){
    return res.status(500).json({message:"Wrong Password"});
  }
  const token= createToken(user);
  return res.status(200).json({message:"Login successfully", token});
})
 
UserRoute.put('/forgotpassword', async (req,res)=>{
  const {email, newpassword}=req.body;
  if(!email){
    return res.status(500).json({message:"Please provide email"})
  }
  const user=await User.findOne({email});
  if(!user){
    return res.status(500).json({message:"User not found."})
  }
  const hashedpassword=createHmac('sha256',user.salt).update(newpassword).digest('hex');
  if(hashedpassword===user.password){
    return res.status(500).json({message:"New password should not be same as old password"});
  }
  user.password=hashedpassword;
  await user.save();
  return res.status(200).json({message:"Password reset successfully"});
})


module.exports=UserRoute;