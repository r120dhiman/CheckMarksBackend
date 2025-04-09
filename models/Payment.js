const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
   amount:{
    type: Number,
    required: true,
   },
   paymentId:{
    type:String,
    required:true
   }
  },
  { timestamps: true } 
);


const Payment = mongoose.model("Payment", PaymentSchema);

module.exports = Payment;