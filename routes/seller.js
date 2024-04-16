// router init
const express = require("express");
const router = express.Router();

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");

// create a seller
router.get("/create/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  // check whether user is logged in
  if (req.user && req.user.email === user.email) {
    return res.render("seller/create", {
      user: {
        id,
        username: user.username,
        email: user.email,
        isSeller: user.isSeller,
      },
    });
  }
  req.flash(
    "message",
    "Please login to validate for application of seller authorization."
  );
  res.redirect("/user/login");
});

router.post("/create/:id", async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  const {
    username,
    email,
    companyName,
    companyGUInumber,
    companyBankCode,
    companyBankAccount,
  } = req.body;
  //   check all inputs are provided
  if (
    !username ||
    !email ||
    !companyName ||
    !companyGUInumber ||
    !companyBankCode ||
    !companyBankAccount
  ) {
    return res.render("seller/create", {
      message: "All information is required.",
    });
  }

  //   check whether all input data matches
  if (
    username === user.username &&
    email === user.email &&
    companyGUInumber.length === 8 &&
    companyBankCode.length === 3 &&
    companyBankAccount.length === 14
  ) {
    const seller = await Seller.create({
      user: user._id,
      companyName: companyName,
      companyGUInumber,
      companyBankCode,
      companyBankAccount,
    });
    user.isSeller = true;
    await user.save();
    req.flash("message", "Seller application succeeded.");
    return res.redirect(`/seller/${seller.user}`);
  }
  res.render("seller/create", {
    seller,
    message: "All information must be valid.",
  });
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
  res.render("seller/profile", {
    seller,
  });
});

// update a seller
router.patch("/update/:id", (req, res) => {});

// delete a seller
router.delete("/delete/:id", (req, res) => {});

module.exports = router;
