const Cart = require("../models/carts");

async function checkNoOverOrder(req) {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "products.product",
      select: "title price inventory img_url",
    })
    .exec();

    console.log(`cart: ${cart}`)

    if (!cart.products){
      return req.flash("message", "Cart empty.")
    }

  // check each product's quantity not larger than its inventory,
  // if larger, adjust the quantity and add message, and then redirect user to their cart
  let message = "";
  for (let i = cart.products.length - 1; i >= 0; i--) {
    const item = cart.products[i];
    const inventory = item.product.inventory;
    if (item.quantity > inventory) {
      item.quantity = inventory;
      if (item.quantity === 0) {
        message += `${item.product.title} is currently out of stock. `;
        cart.products.splice(i, 1);
      } else {
        message += `Inventory Shortage. You can buy at most ${inventory} ${item.title}(s) now.`;
      }
      await cart.save();
    }
  }
  console.log("checking if over order...");
  if (message !== "") {
    req.flash("message", message);
    return null;
  } else {
    return cart;
  }
}

module.exports = checkNoOverOrder;
