// router init
const express = require("express");
const router = express.Router();

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");
const Product = require("../models/products");

// create a product
router.get("/create", async (req, res) => {
  if (!req.user) {
    req.flash("message", "Please log in first.");
    return res.redirect("/user/login");
  }
  const user = await User.findOne({ email: req.user.email });
  const seller = await Seller.findOne({ user: user._id });
  if (!seller) {
    return res.status(403).send("Unauthorized user.");
  }
  return res.render("product/create", { user, seller });
});

router.post("/create", async (req, res) => {
  if (!req.user) {
    req.flash("message", "Please log in first.");
    return res.redirect("/user/login");
  }
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
router.patch("/:id/update", (req, res) => {});

// delete a product
router.delete("/:id/delete", (req, res) => {});

module.exports = router;
