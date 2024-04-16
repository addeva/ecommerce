function checkAuth(req, res, next) {
  if (req.user) return next();
  req.flash("message", "Please login first.");
  res.redirect("/user/login");
}

module.exports = checkAuth;
