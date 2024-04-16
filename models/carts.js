const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        required: false,
        ref: "Product",
      },
      quantity: { type: Number, required: true, default: 1 },
      checkout: { type: Boolean, required: true, default: true },
    },
  ],
});

module.exports = mongoose.model("Cart", cartSchema);
