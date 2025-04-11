const mongoose = require("mongoose");


const marksSchema = new mongoose.Schema(
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
    user_id:{
        type:String,
    }
  },
  { timestamps: true } 
);


const Marks = mongoose.model("Marks", marksSchema);

module.exports = Marks;