const mongoose = require("mongoose");

const Product = require("./products");

const sellerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  companyName: { type: String, required: true },
  companyGUInumber: {
    type: String,
    required: true,
    // unique: true,
    match: [/^[0-9]{8}$/, "8-digit GUI number is required."],
  },
  companyBankCode: {
    type: String,
    required: true,
    match: [/^[0-9]{3}$/, "3-digit bank code is required."],
  },
  companyBankAccount: {
    type: String,
    required: true,
    match: [/^[0-9]{14}$/, "14-digit bank account is required."],
  },
  appliedAt: {
    type: Date,
    required: true,
    default: Date.now(),
  },
});

sellerSchema.pre(
  "deleteOne",
  { document: true, query: false },
  async function (next) {
    try {
      await Product.deleteMany({ seller: this._id }).exec();
      next();
    } catch (error) {
      next(error);
    }
  }
);

module.exports = mongoose.model("Seller", sellerSchema);
