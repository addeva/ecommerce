// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const checkNoOverOrder = require("../middleware/checkNoOverOrder");

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");

// router init
const router = express.Router();

// add/remove products to/from cart
router.get("/", checkAuth, async (req, res) => {
  const cart = await checkNoOverOrder(req);
  if (!cart) return res.redirect("/cart");
  let total = 0;
  for (product of cart.products) {
    total += product.product.price * product.quantity;
  }
  res.render("cart/index", { cart, total });
});

router.post("/", checkAuth, async (req, res) => {
  const id = req.body.productId;
  const product = await Product.findById(id);
  if (!product) {
    req.flash("message", "Product doesn't exist.");
    return res.redirect("/");
  }
  const cart = await Cart.findOne({ user: req.user._id });

  let existingProductIndex = -1;
  for (let i = 0; i < cart.products.length; i++) {
    if (cart.products[i].product.toString() === id) {
      existingProductIndex = i;
      break;
    }
  }
  // if the product already in user's cart ->
  //    adjust quantity if inventory > quantity else show message
  if (existingProductIndex > -1) {
    if (product.inventory > cart.products[existingProductIndex].quantity) {
      cart.products[existingProductIndex].quantity += 1;
    } else {
      req.flash(
        "message",
        `Inventory Shortage. Can't add more ${product.title} to cart.`
      );
      return res.redirect("/");
    }
    // product not in user's cart ->
    //    push product to user's cart if inventory > 0 else show message
  } else {
    if (product.inventory) {
      cart.products.push({ product: id, quantity: 1 });
    } else {
      req.flash(
        "message",
        `Inventory Shortage. Can't add more ${product.title} to cart.`
      );
      return res.redirect("/");
    }
  }
  await cart.save();

  req.flash("message", `Added ${product.title} successfully.`);
  res.redirect("/");
});

router.put("/", checkAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const { productId, action } = req.body;
  const product = await Product.findById(productId);
  for (let i = 0; i < cart.products.length; i++) {
    if (cart.products[i].product.toString() === productId) {
      switch (action) {
        case "increment":
          // adjust quantity if inventory > quantity else show message
          if (product.inventory > cart.products[i].quantity) {
            cart.products[i].quantity += 1;
            break;
          } else {
            req.flash(
              "message",
              `Inventory Shortage. Can't add more ${product.title} to cart.`
            );
            return res.redirect("/cart");
          }
        case "decrement":
          cart.products[i].quantity -= 1;
          break;
      }
      if (cart.products[i].quantity <= 0) {
        cart.products.splice(i, 1);
      }
      break;
    }
  }
  await cart.save();
  res.redirect("/cart");
});

router.delete("/", checkAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const { productId } = req.body;
  for (let i = 0; i < cart.products.length; i++) {
    if (cart.products[i].product.toString() === productId) {
      cart.products.splice(i, 1);
    }
    break;
  }
  await cart.save();
  res.redirect("/cart");
});

module.exports = router;
