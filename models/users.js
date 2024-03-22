const mongoose = require("mongoose");
require("mongoose-type-email");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: mongoose.SchemaTypes.Email, required: true, unique: true },
  hashedPassword: {
    type: String,
    required: true,
    default: "passwordNotSetYet",
  },
  verified: { type: Boolean, required: true, default: false },
  verificationToken: {
    type: String,
    required: true,
    default: "noVerificationTokenGeneratedYet",
  },
  signupAt: { type: Date, required: true, default: Date.now() },
  lastLogin: { type: Date },
  lastLogout: { type: Date },
});

module.exports = mongoose.model("User", userSchema);
