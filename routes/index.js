// import modules
const express = require("express");

// import models
const Product = require("../models/products");

// router init
const router = express.Router();

// route for homepage
router.get("/", async (req, res) => {
  // get all products
  let products = await Product.find();
  res.render("index", { products });
});

module.exports = router;
