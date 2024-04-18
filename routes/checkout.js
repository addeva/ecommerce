// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");

// router init
const router = express.Router();

router.post("/", checkAuth, async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: "products.product",
      select: "title price",
    })
    .exec();
  console.log(cart);
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: cart.products.map((product) => {
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: product.product.title,
            },
            unit_amount: product.product.price * 100,
          },
          quantity: product.quantity,
        };
      }),
      success_url: `${process.env.CLIENT_URL}/checkout/success`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });
    res.redirect(`${session.url}`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get("/success", async (req, res) => {
  // Clear cart products if payment succeeds
  await Cart.updateOne({ user: req.user._id }, { $set: { products: [] } });
  // Handle any additional logic after successful payment
  // For example, send confirmation emails, update order status, etc.
  req.flash(
    "message",
    "Purchase succeeds. Order details will be sent to your email recently."
  );
  res.redirect("/");
});

module.exports = router;
