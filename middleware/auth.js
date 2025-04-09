const jwt= require('jsonwebtoken');
const User= require('../models/User');

const auth=async (req,res,next)=>{
    const token=  req.body.auth;
    if(!token){
        return res.status(401).json({message:"Unauthorized"});
    }
    try{
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        const user= await User.findOne({email:decoded.email});
        if(!user){
            return res.status(401).json({message:"Unauthorized"});
        }
        req.user= user;
        next();
    }catch(err){
        return res.status(401).json({message:"Unauthorized"});
    }
}

const isAdmin= (req,res,next)=>{
    if(!req.user.isAdmin){
        return res.status(403).json({message:"Forbidden"});
    }
    next();
}

const createToken= (user)=>{
    return jwt.sign({id:user._id},process.env.JWT_SECRET,{
        expiresIn:"1d"
    });
}
 
const verifyTokenAndAuthorization= (req,res,next)=>{
    const token= req.cookies.auth;
    if(!token){
        return res.status(401).json({message:"Unauthorized"});
    }
    try{
        const decoded= jwt.verify(token,process.env.JWT_SECRET);
        if(decoded.id !== req.params.id){
            return res.status(403).json({message:"Forbidden"});
        }
        next();
    }catch(err){
        return res.status(401).json({message:"Unauthorized"});
    }
}

module.exports={
    auth,
    isAdmin,
    createToken,
    verifyTokenAndAuthorization
}