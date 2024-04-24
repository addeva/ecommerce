// router init
const express = require("express");
const checkAuth = require("../middleware/checkAuth");

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");
const Product = require("../models/products");

// router init
const router = express.Router();

// create seller
router.get("/create", checkAuth, async (req, res) => {
  const seller = new Seller();
  return res.render("seller/create", { seller });
});

router.post("/create", checkAuth, async (req, res) => {
  const user = req.user;
  const {
    username,
    email,
    companyName,
    companyGUInumber,
    companyBankCode,
    companyBankAccount,
  } = req.body;
  if (
    username === user.username &&
    email === user.email &&
    companyName &&
    companyGUInumber.length === 8 &&
    companyBankCode.length === 3 &&
    companyBankAccount.length === 14
  ) {
    const seller = new Seller({
      user: user._id,
      companyName: companyName,
      companyGUInumber,
      companyBankCode,
      companyBankAccount,
    });
    try {
      await seller.save();
      user.isSeller = true;
      await user.save();
      req.flash("message", "Seller application succeeded.");
      return res.redirect(`/seller/${seller.user}`);
    } catch {
      return res.render("seller/create", {
        message: "All information is required and needs to be valid.",
      });
    }
  }
  // redirect if information is invalid
  req.flash("message", "All information is required and needs to be valid.");
  return res.redirect("/seller/create");
});

// read a seller
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const seller = await Seller.findOne({ user: id }).populate("user").exec();
  if (!seller) {
    return res.render("seller/profile", {
      message: "Seller doesn't exist.",
    });
  }
  const products = await Product.find({ seller: seller._id });
  res.render("seller/profile", {
    seller,
    products,
  });
});

// delete a seller
router.delete("/delete", (req, res) => {});

module.exports = router;
