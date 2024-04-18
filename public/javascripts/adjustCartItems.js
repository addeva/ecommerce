const Cart = require("../../models/carts");
const Product = require("../../models/products");

const cart = Cart.findById()

document.querySelectorAll(".btn_add").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const productId = btn.dataset.productId;
    Product.findById(productId);
  });
});
