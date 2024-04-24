// import modules
const express = require("express");
const checkAuth = require("../middleware/checkAuth");

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");
const Product = require("../models/products");

// router init
const router = express.Router();

// create product
router.get("/create", checkAuth, async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    req.flash("message", "Unauthorized.");
    return res.redirect("/");
  }
  const product = new Product();
  return res.render("product/create", { seller, product });
});

router.post("/create", checkAuth, async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    req.flash("message", "Unauthorized.");
    return res.redirect("/");
  }
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
  } catch {
    return res.render("product/create", {
      seller,
      product,
      message: "All inputs with * are required.",
    });
  }
});

// read product
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findById(id).populate("seller").exec();
    if (!product) {
      return res.render("product/profile", {
        message: "Product doesn't exist.",
      });
    }
    res.render("product/profile", { product });
  } catch (error) {
    console.error(error);
    return res.render("product/profile", {
      message: "Error occurred while fetching product details.",
    });
  }
});

// update product
router.get("/update/:id", checkAuth, async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    req.flash("message", "Unauthorized.");
    return res.redirect("/");
  }
  const { id } = req.params;
  const product = await Product.findById(id).populate("seller").exec();
  if (!product) {
    return res.render("product/profile", {
      message: "Product doesn't exist.",
    });
  }
  if (seller._id.toString() !== product.seller._id.toString()) {
    return res.render("product/profile", {
      product,
      message: "Unauthorized.",
    });
  }
  res.render("product/update", { product, seller });
});

router.put("/update/:id", checkAuth, async (req, res) => {
  const seller = await Seller.findOne({ user: req.user._id });
  if (!seller) {
    req.flash("message", "Unauthorized.");
    return res.redirect("/");
  }
  const { id } = req.params;
  try {
    // Find the product by its ID and ensure that the seller is authorized to update it
    const product = await Product.findOneAndUpdate(
      { _id: id, seller: seller._id },
      {
        $set: {
          title: req.body.title,
          price: req.body.price,
          img_url: req.body.img_url,
          description: req.body.description,
          inventory: req.body.inventory,
        },
      },
      { new: true } // Return the updated product
    );

    // If the product doesn't exist or the seller is not authorized, render the appropriate message
    if (!product) {
      return res.render("product/profile", {
        message: "Product doesn't exist or unauthorized.",
      });
    }

    // Redirect to the product profile page
    return res.redirect(`/product/${product._id}`);
  } catch (error) {
    console.error(error);
    return res.render("product/update", { message: "An error occurred." });
  }
});

// delete product
router.delete("/:id/delete", checkAuth, (req, res) => {});

module.exports = router;
