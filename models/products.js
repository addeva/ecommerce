const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "Seller",
  },
  img_url: {
    type: String,
    required: true,
    validate: {
      validator: function (value) {
        return /^(http|https):\/\/[^ "]+$/.test(value);
      },
      message: (props) => `${props.value} is not a valid URL!`,
    },
  },
  description: {
    type: String,
  },
  inventory: { type: Number, required: true, min: 0 },
  unitSold: { type: Number, required: true, min: 0, default: 0 },
});

module.exports = mongoose.model("Product", productSchema);
