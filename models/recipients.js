const mongoose = require("mongoose");

const recipientSchema = new mongoose.Schema({
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  name: { type: String, required: true },
  email: { type: mongoose.SchemaTypes.Email, required: true },
  phoneNumber: { type: String, required: true },
  postcode: { type: String, required: true },
  address: { type: String, required: true },
});

module.exports = mongoose.model("Recipient", recipientSchema);
