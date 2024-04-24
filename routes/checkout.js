// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const checkNoOverOrder = require("../middleware/checkNoOverOrder");
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");
const Recipient = require("../models/recipients");

// router init
const router = express.Router();

// checkout
router.get("/", checkAuth, async (req, res) => {
  const cart = await checkNoOverOrder(req);
  if (!cart) return res.redirect("/cart");
  const recipient = new Recipient();
  res.render("checkout/recipientInfo", { recipient });
});

router.post("/", checkAuth, async (req, res) => {
  const cart = await checkNoOverOrder(req);
  if (!cart) return res.redirect("/cart");
  const recipient = new Recipient({
    buyer: req.user._id,
    name: req.body.name,
    email: req.body.email,
    phoneNumber: req.body.phoneNumber,
    postcode: req.body.postcode,
    address: req.body.address,
  });

  console.log("cart: ", cart);
  console.log("recipient: ", recipient);

  try {
    await recipient.save();
  } catch {
    return res.render("checkout/recipientInfo", {
      recipient,
      message: "All inputs are required and need to be valid.",
    });
  }

  // create Stripe checkout session
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
      success_url: `${process.env.CLIENT_URL}`,
      cancel_url: `${process.env.CLIENT_URL}/cart`,
    });
    res.redirect(`${session.url}`);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Webhook endpoint for Stripe events
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.ENDPOINT_SECRET;
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        // Get the user associated with the payment
        const user = await User.findOne({
          stripeCustomerId: paymentIntent.customer,
        });
        if (!user) {
          console.error("User not found for payment intent.");
          res.status(404).send("User not found.");
          return;
        }
        // Update product inventory/unitsSold & clear user's cart
        const cart = await Cart.findOne({ user: user._id });
        for (product of cart.products) {
          await Product.findByIdAndUpdate(product.product, {
            $inc: { inventory: -product.quantity, unitSold: product.quantity },
          });
        }
        cart.products = [];
        await cart.save();
        req.session.message =
          "You've paid for the order successfully. Order details will be sent to your email soon.";
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  }
);

module.exports = router;
