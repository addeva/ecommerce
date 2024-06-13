// import modules
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const checkAuth = require("../middleware/checkAuth");

// import models
const User = require("../models/users");
const Seller = require("../models/sellers");
const Cart = require("../models/carts");

// nodemailer setups
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com",
  post: 587,
  secure: false,
  auth: {
    user: process.env.USER,
    pass: process.env.PASS,
  },
  tls: {
    ciphers: "SSLv3",
    rejectUnauthorized: false,
  },
});

// configure passport local strategy
passport.use(
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await User.findOne({ email });
        if (!user) {
          return done(null, false, { message: "Incorrect email or password." });
        }
        const validPassword = await bcrypt.compare(
          password,
          user.hashedPassword
        );
        if (!validPassword) {
          return done(null, false, { message: "Incorrect email or password." });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

// Passport 序列化用户
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Passport 反序列化用户
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("_id username email isSeller");
    done(null, user);
  } catch (error) {
    done(error);
  }
});

// router init
const router = express.Router();

// signup a user
router.get("/signup", (req, res) => {
  res.render("user/signup");
});

// email verification
router.post("/verify", async (req, res) => {
  try {
    // check whether username and email are valid
    const { username, email } = req.body;
    if (!username || !email) {
      req.flash(
        "message",
        "Username and email are required for email verification."
      );
      return res.redirect("/user/signup");
    }

    // check whether the email has been registered
    const emailRegistered = await User.findOne({ email });

    // check whether there's such user with the email in the collection
    if (emailRegistered) {
      if (emailRegistered.verified) {
        // email already verified  => password set? redirect /user/login : redirect /user/setPassword
        res.locals.user = {
          username: emailRegistered.username,
          email: emailRegistered.email,
        };
        if (emailRegistered.hashedPassword !== "undefined") {
          req.flash(
            "message",
            "This email has been verified. You can log in straight forward."
          );
          return res.redirect("/user/login");
        }
        req.flash(
          "message",
          "This email has been verified. You can set password straight forward."
        );
        return res.redirect("/user/setPassword");
      }
      if (emailRegistered.expireAt > Date.now()) {
        // email not verified but link expired => redirect /user/signup and send a new verification email
        req.flash(
          "message",
          `Verification email has been sent. It's still valid. Please check your email(${emailRegistered.email}).`
        );
        return res.redirect("/user/signup");
      }
    }

    // generate token
    const minute = 5;
    const verification = {
      token: uuidv4(),
      expireAt: new Date(Date.now() + 1000 * 60 * minute),
    };

    // send verification email
    const verificationLink = `http://localhost:3000/user/verify/${verification.token}`;
    const mailOptions = {
      from: process.env.USER_WITH_NAME,
      to: email,
      subject: "Email Verification",
      html: `<h3>Hello ${username}</h3>
          <h4>Please click the link below to confirm your email:</h4>
          <a href="${verificationLink}">${verificationLink}</a>`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(error);
      } else {
        console.log("Email sent: ", info.response);
      }
    });

    // update user whose email has been registered
    if (emailRegistered) {
      await emailRegistered.updateOne({
        $set: {
          username,
          verified: false,
          verification,
        },
      });
    } else {
      // create new user with provided data
      const user = User.create({
        username,
        email,
        verified: false,
        verification,
      });
    }

    // redirect the user to /user/signup with check mail message
    req.flash(
      "message",
      `Please check your email (${email}) for verification.`
    );
    return res.redirect("/user/signup");
  } catch (error) {
    console.error(error);
    req.flash("message", "Internal sever error.");
    res.redirect("/user/signup");
  }
});

// email verification
router.get("/verify/:token", async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    "verification.token": token,
    "verification.expireAt": { $gt: Date.now() },
  });
  if (!user) {
    req.flash(
      "message",
      "Invalid or expired verification link. Please input your username and email again for new verification email."
    );
    return res.redirect("/user/signup");
  }
  user.verified = true;
  await user.save();
  res.locals.user = {
    id: user._id,
    username: user.username,
    email: user.email,
  };
  res.render("user/setPassword", { user: res.locals.user });
});

// set password
router.post("/setPassword", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // redirect to /user/signup if input imcomplete
    if (!username || !email || !password) {
      req.flash("message", "Username, email and password are all required.");
      res.locals.user = { username, email, password };
      return res.redirect("/user/setPassword");
    }

    // redirect to /user/signup if input incorrect
    const user = await User.findOne({ username, email });
    if (!user) {
      req.flash("message", "No such user with the username and/or email.");
      return res.redirect("/user/setPassword");
    }

    // redirect to /user/login if users try to set their passwords again
    if (user.hashedPassword !== "undefined") {
      req.flash("message", "Password already set.");
      req.user = { username, email };
      return res.redirect("/user/login");
    }

    // Update the hashedPassword property if user exists
    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashedPassword = hashedPassword;
    user.signupAt = Date.now();
    await user.save();
    Cart.create({ user: user._id });
    req.flash("message", "Password set successfully.");
    req.user = { username, email, password };
    return res.redirect("/user/login");
  } catch (error) {
    console.error(error);
    return res.redirect("/");
  }
});

// login a user
router.get("/login", (req, res) => {
  res.render("user/login");
});

router.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/user/login",
    failureFlash: true,
  }),
  async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    user.lastLogin = Date.now();
    await user.save();
    req.flash("message", "Logged in successfully.");
    res.redirect("/");
  }
);

// reset password
router.get("/resetPassword", (req, res) => {
  res.render("user/resetPassword");
});

router.post("/resetPassword", async (req, res) => {
  const { email } = req.body;
  // rerender resetPassword page of input data imcomplete
  if (!email) {
    return res.render("user/resetPassword", {
      message: "Email is required.",
    });
  }

  // no user with provided email => rerender resetPassword page
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("user/resetPassword", {
      message: "This email hasn't been registered.",
    });
  }

  if (
    typeof user.resetPassword.token !== "undefined" &&
    user.resetPassword.expireAt > Date.now()
  ) {
    return res.render("user/resetPassword", {
      message:
        "You have requested for reseting password with this email within minutes. Check your email or request later.",
    });
  }

  // user exists => send password reseting email
  // generate token
  const minute = 5;
  user.resetPassword = {
    token: uuidv4(),
    expireAt: new Date(Date.now() + 1000 * 60 * minute),
  };
  await user.save();

  // send password reseting email
  const resetPasswordLink = `http://localhost:3000/user/resetPassword/${user.resetPassword.token}`;
  const mailOptions = {
    from: process.env.USER_WITH_NAME,
    to: email,
    subject: "Password Reseting",
    html: `<h3>Hello ${user.username}</h3>
        <h4>Please click the link below to reset your password:</h4>
        <a href="${resetPasswordLink}">${resetPasswordLink}</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });

  res.render("user/resetPassword", {
    user: { email },
    message: `Password reseting email has been sent to your email (${user.email}).`,
  });
});

router.put("/resetPassword", async (req, res) => {
  const { email, newPassword, confirmNewPassword } = req.body;
  // rerender password reseting page if input data imcomplete
  if (!email || !newPassword || !confirmNewPassword) {
    return res.render("user/resetPassword", {
      user: { email },
      message:
        "Email, new password and confirming new password are all required.",
    });
  }

  // resetPassword and confirmNewPassword don't match => rerender password reseting page
  if (newPassword !== confirmNewPassword) {
    return res.render("user/resetPassword", {
      user: { email },
      message: "New passwords DON'T match.",
    });
  }

  // check if user with that email exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("user/resetPassword", {
      user: { email },
      message: "No such use with that email.",
    });
  }

  // new passwords match => redirect to /user/login
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.hashedPassword = hashedNewPassword;
  await user.save();
  req.user = { username: user.username, email, password: newPassword };
  return res.redirect("/user/login");
});

// route for verify password reset link
router.get("/resetPassword/:token", async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    "resetPassword.token": token,
    "resetPassword.expireAt": { $gt: Date.now() },
  });
  if (!user) {
    req.flash(
      "message",
      "Invalid or expired password reset link. Enter email and get a new one."
    );
    return res.redirect("/user/resetPassword");
  }
  res.render("user/resetPassword", { user: { email: user.email } });
});

// user profile
router.get("/profile", checkAuth, (req, res) => {
  res.render("user/profile");
});

// logout
router.get("/logout", (req, res, next) => {
  req.logOut((error) => {
    if (error) return next(error);
  });
  res.redirect("/");
});

module.exports = router;
