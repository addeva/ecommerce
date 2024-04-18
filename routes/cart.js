// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");

// router init
const router = express.Router();

// add/remove products to/from cart
router.get("/", checkAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "products.product",
      select: "title price",
    })
    .exec();
  if (!cart) {
    return res.render("cart/index", {
      message: "Cart doesn't exist.",
    });
  }
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
  if (existingProductIndex > -1) {
    cart.products[existingProductIndex].quantity += 1;
  } else {
    cart.products.push({ product: id, quantity: 1 });
  }
  await cart.save();

  req.flash("message", `Added ${product.title} successfully.`);
  res.redirect("/");
});

router.put("/", async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  const { productId, action } = req.body;
  for (let i = 0; i < cart.products.length; i++) {
    if (cart.products[i].product.toString() === productId) {
      switch (action) {
        case "increment":
          cart.products[i].quantity += 1;
          break;
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

router.delete("/", async (req, res) => {
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
