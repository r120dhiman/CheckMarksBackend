const mongoose = require("mongoose");

const LandingNumber = new mongoose.Schema(
  {
   count:{
    type:Number,
    default:0
   }
  },
  { timestamps: true } 
);


const LandingCount = mongoose.model("Payment", LandingNumber);

module.exports = LandingCount;