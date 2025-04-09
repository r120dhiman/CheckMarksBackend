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
    isEnrolled:{
      type: Boolean,
      default: false,
    },
    paymentStatus:{
      type: Boolean,
      default: false,
    },
    isAdmin:{
      type: Boolean,
      default: false,
    },
    payment:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment'
    },
    paymentId:{
      type:String,
      default:"N/A"
    },
    marks:{
      type: Number,
      default: 0,
    },
    shift_Date:{
      type: String,
      default: "N/A",
    },
    phone:{
      type: String,
      required: false,
    },
    city:{
      type: String,
      required: false,
    },
  },
  { timestamps: true } 
);

userSchema.pre("save", function(next) {
    const user = this;
    
    // Skip hashing if password isn't modified or is empty
    if (!user.isModified("password") || !user.password) {
        return next();
    }
    
    const Salt = randomBytes(16).toString('hex');
    const hashedPassword = createHmac('sha256', Salt)
        .update(user.password)
        .digest('hex');
        
    user.password = hashedPassword;
    user.salt = Salt;
    next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;