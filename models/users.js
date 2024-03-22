const mongoose = require("mongoose");
require("mongoose-type-email");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: mongoose.SchemaTypes.Email, required: true, unique: true },
  hashedPassword: {
    type: String,
    required: true,
    default: "undefined",
  },
  verified: { type: Boolean, required: true, default: false },
  verification: {
    token: {
      type: String,
      required: true,
      default: "undefined",
    },
    expireAt: {
      type: Date,
      required: true,
      default: new Date(Date.now() + 1000 * 60 * 60),
    },
  },
  resetPassword: {
    token: { type: String, required: false },
    expireAt: { type: Date, required: false },
  },
  signupAt: { type: Date, required: true, default: Date.now() },
  lastLogin: { type: Date },
  lastLogout: { type: Date },
});

module.exports = mongoose.model("User", userSchema);
