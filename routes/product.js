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
  const seller = await Seller.findOne({ user: req.user._id });
  const product = new Product({ seller: seller._id });
  return res.render("product/create", { seller, product });
});

router.post("/create", checkAuth, async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  const product = new Product({
    seller: req.body.sellerId,
    title: req.body.title,
    price: req.body.price,
    img_url: req.body.img_url,
    description: req.body.description,
    inventory: req.body.inventory,
  });
  try {
    await product.save();
    return res.redirect(`/product/${product._id}`);
  } catch (error) {
    console.error(error);
    return res.render("product/create", {
      seller,
      product,
      message: "All inputs with * are required.",
    });
  }
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
