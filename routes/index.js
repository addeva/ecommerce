// import modules
const express = require("express");

// router init
const router = express.Router();

// route for homepage
router.get("/", (req, res) => {
  if (req.session.user) {
    return res.render("index", {
      username: req.session.user.username,
      showSignup: false,
      showLogin: false,
      showLogout: true,
    });
  }
  res.render("index", { showSignup: true, showLogin: true, showLogout: false });
});

module.exports = router;
