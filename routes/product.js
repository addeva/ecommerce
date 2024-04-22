// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");
const Product = require("../models/products");

// router init
const router = express.Router();

// create a product
router.get("/create", checkAuth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  const seller = await Seller.findOne({ user: user._id });
  if (!seller) {
    return res.status(403).send("Unauthorized user.");
  }
  const product = await Product.create({ seller: seller._id });
  return res.render("product/create", { user, seller, product });
});

router.post("/create", checkAuth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  const seller = await Seller.findOne({ user: user._id });
  const {
    sellerId,
    companyName,
    title,
    price,
    img_url,
    description,
    inventory,
  } = req.body;
  if (!sellerId || !companyName || !title || !price || !img_url || !inventory) {
    return res.render("product/create", {
      user,
      seller,
      message: "Please fill out all inputs with a *.",
    });
  }
  const product = await Product.create({
    seller: sellerId,
    companyName,
    title,
    price,
    img_url,
    description,
    inventory,
  });
  req.user = user;
  req.seller = seller;
  res.redirect(`/product/${product._id}`);
});

// read a product
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("seller").exec();
  if (!product) {
    return res.render("product/profile", { message: "Product doesn't exist." });
  }
  res.render("product/profile", { product });
});

// update a product
router.get("/update/:id", checkAuth, async (req, res) => {
  const { id } = req.params;
  const product = await Product.findById(id).populate("seller").exec();
  const seller = product.seller;
  if (!product) {
    return res.render("product/profile", { message: "Product doesn't exist." });
  }
  res.render("product/update", { product, seller });
});

router.put("/update/:id", checkAuth, async (req, res) => {
  const { id } = req.params;
});

// delete a product
router.delete("/:id/delete", checkAuth, (req, res) => {});

module.exports = router;
