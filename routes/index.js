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

  // filter products with search options
  let searchOptions = {};
  if (req.params.keyword) {
    searchOptions.keyword = new RegExp(req.params.keyword, "i");
  }
  if (req.params.price_low) {
    searchOptions.price_low = req.params.price_low;
  }
  if (req.params.price_high) {
    searchOptions.price_high = req.params.price_high;
  }
  if (req.params.category) {
    searchOptions.category = req.params.category;
  }
  res.render("index", { products });
});

module.exports = router;
