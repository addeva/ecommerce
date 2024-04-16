// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");

// import models
const Cart = require("../models/carts");
const Product = require("../models/products");
const User = require("../models/users");

// router init
const router = express.Router();

router.get("/", checkAuth, (req, res) => {
  res.send("Checkout page coming soon...");
});

module.exports = router;
