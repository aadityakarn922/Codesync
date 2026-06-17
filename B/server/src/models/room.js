const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
  },

  code: {
    type: String,
    default: "",
  },

  language: {
    type: String,
    default: "javascript",
  },
});

module.exports=mongoose.model("room",roomSchema)