// import models
const Seller = require("../models/sellers");

function checkAuth(req, res, next) {
  if (req.user) return next();
  req.flash("message", "Please login first.");
  return res.redirect("/user/login");
}

module.exports = checkAuth;
