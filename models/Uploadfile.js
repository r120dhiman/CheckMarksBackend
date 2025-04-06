const mongoose = require("mongoose");
const User = require("./User.js");

const UploadSchema = new mongoose.Schema(
  {
    uploadedby: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    allQuestions: [
      {
        questionID: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["MCQ", "SA"],
          required: true,
        },
        status: {
          type: String,
        },
        chosenOption: {
          type: String,
          default: "X",
        },
        chosenOptionID: {
          type: String,
          default: "X",
        },
        givenAnswer: {
          type: String,
          default: "X",
        },
        options: [
          {
            optionNumber: Number,
            optionID: String,
          },
        ],
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const Upload = mongoose.model("Uploads", UploadSchema);

module.exports = Upload;