const mongoose = require("mongoose");
const {createHmac,randomBytes}=require('crypto')

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: false, 
    },
    salt: {
      type: String,
      required: false,
    },
    image:{
      type:String,
      default:"https://www.flaticon.com/free-icon/user-avatar_6596121"
    }
  },
  { timestamps: true } 
);

userSchema.pre("save",function(next){
    const user=this;
    if(!user.isModified("password")){
        return next();
    }
    const Salt=randomBytes(16).toString('hex');
    const updatedpassword=createHmac('sha256',Salt).update(user.password).digest('hex');
    user.password=updatedpassword;
    user.salt=Salt;
    next();
})


const User = mongoose.model("User", userSchema);

module.exports = User;