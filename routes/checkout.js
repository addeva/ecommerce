// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");
const checkNoOverOrder = require("../middleware/checkNoOverOrder");
const stripe = require("stripe")(process.env.STRIPE_PRIVATE_KEY);
const nodemailer = require("nodemailer");

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");
const Recipient = require("../models/recipients");

// router init
const router = express.Router();

// nodemailer setups
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  post: 587,
  secure: false,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

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

  try { await recipient.save(); } catch {
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
      line_items: cart.products.map((item) => {
        return {
          price_data: {
            currency: "usd",
            product_data: {
              name: item.product.title,
            },
            unit_amount: item.product.price * 100,
          },
          quantity: item.quantity,
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
        console.log('PaymentIntent was successful!');
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
        for (item of cart.products) {
          await Product.findByIdAndUpdate(item.product, {
            $inc: { inventory: -item.quantity, unitSold: item.quantity },
          });
        }
        cart.products = [];
        await cart.save();
        
        // Get the recipient info
        const recipient = await Recipient.findOne({ buyer: user._id }).sort({ createdAt: -1 });
        if (!recipient) {
          console.error("Recipient not found.");
          res.status(404).send("Recipient not found.");
          return;
        }

        // Send email to the user
        const mailOptions = {
          from: process.env.USER_WITH_NAME,
          to: user.email,
          subject: 'Order Confirmation',
          text: `Thank you for your purchase! Your order has been confirmed. Here are the recipient details:\n
          Name: ${recipient.name}\n
          Email: ${recipient.email}\n
          Phone Number: ${recipient.phoneNumber}\n
          Postcode: ${recipient.postcode}\n
          Address: ${recipient.address}`,
          html: `<h1>Thank you for your purchase!</h1>
          <p>Your order has been confirmed. Here are the recipient details:</p>
          <ul>
            <li>Name: ${recipient.name}</li>
            <li>Email: ${recipient.email}</li>
            <li>Phone Number: ${recipient.phoneNumber}</li>
            <li>Postcode: ${recipient.postcode}</li>
            <li>Address: ${recipient.address}</li>
          </ul>`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
          }
        });
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  }
);

module.exports = router;
