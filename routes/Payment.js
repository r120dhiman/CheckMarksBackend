const {Router}=require('express');
const User = require('../models/User');
const Payment = require('../models/Payment');
const PaymentRouter=Router();


PaymentRouter.get("/check", (req, res ) => {
  return res.status(200).json({message:"OK"});
}
)

PaymentRouter.post("/newpayment", async (req, res ) => {
  const { paymentId}=req.body;
  const user=req.user;
  const userId=user._id;
  if(!userId || !paymentId){
    return res.status(500).json({message:"All fields are required"});
  }
  if(!user){
    return res.status(500).json({message:"User not found contact owner for refund"});
  }
  const paymentData=await Payment.create({
    name:user.name,
    email:user.email,
    amount:"449",
    paymentId:paymentId
  })
  const updateduser=await User.findByIdAndUpdate(userId,{isEnrolled:true, paymentStatus:true, paymentId:paymentData._id},{new:true})

  return res.status(200).json({message:"Payment scuccessful", paymentData,updateduser});
}
)

PaymentRouter.get('/verifypayment/:id', async (req, res) => {   
    const {id}=req.params;
    const payment=await Payment.findById(id);
    if(!payment){
        return res.status(500).json({message:"Payment not found"});
    }
    return res.status(200).json({message:"Payment found and done by ",payment });
})

module.exports=PaymentRouter;