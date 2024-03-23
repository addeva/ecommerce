// import modules
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const moment = require("moment-timezone");

// import models
const User = require("../models/users");

// router init
const router = express.Router();

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

// route for signup
router.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.render("signup", {
      username: req.session.user.username,
      email: req.session.user.email,
      message: req.session.message,
    });
  }
  res.render("signup", {
    message: req.session.message,
  });
});

router.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // redirect to /user/signup if input imcomplete
    if (!username || !email || !password) {
      req.session.message = "Username, email and password are all required.";
      req.session.user = { username, email, password };
      return res.redirect("/user/signup");
    }

    // redirect to /user/signup if input incorrect
    const user = await User.findOne({ username, email });
    if (!user) {
      req.session.message = "No such user with the username and email.";
      return res.redirect("/user/signup");
    }

    // redirect to /user/login if users try to set their passwords again
    if (user.hashedPassword !== "undefined") {
      req.session.message = "Password already set.";
      req.session.user = { username, email };
      return res.redirect("/user/login");
    }

    // Update the hashedPassword property if user exists
    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashedPassword = hashedPassword;
    user.signupAt = Date.now();
    await user.save();
    console.log(user);
    req.session.user = { username, email, password };
    return res.redirect("/user/login");
  } catch (error) {
    console.error(error);
    return res.redirect("/");
  }
});

// route for email verification
router.post("/verify", async (req, res) => {
  try {
    // check whether username and email are valid
    const { username, email } = req.body;
    if (!username || !email) {
      req.session.message =
        "Username and email are required for email verification.";
      return res.redirect("/user/signup");
    }

    // check whether the email has been registered
    const emailRegistered = await User.findOne({ email });

    // check whether there's such user with the email in the collection
    if (emailRegistered) {
      if (emailRegistered.verified) {
        // email already verified  => password set? redirect /user/login : redirect /user/signup
        req.session.message = "This email has been verified.";
        req.session.user = {
          username: emailRegistered.username,
          email: emailRegistered.email,
        };
        if (emailRegistered.hashedPassword !== "undefined")
          return res.redirect("/user/login");
        return res.redirect("/user/signup");
      }
      if (emailRegistered.expireAt > Date.now()) {
        // email not verified but link expired => redirect /user/signup and send a new verification email
        req.session.message = `Verification email has been sent. It's still valid. Please check your email(${emailRegistered.email}).`;
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

    // redirecrt the user to /user/signup with check mail message
    req.session.message = `Please check your email (${email}) for verification.`;
    return res.redirect("/user/signup");
  } catch (error) {
    console.error(error);
    req.session.message = "Internal sever error.";
    res.redirect("/user/signup");
  }
});

// route for email verification
router.get("/verify/:token", async (req, res) => {
  const token = req.params.token;
  const user = await User.findOne({
    "verification.token": token,
    "verification.expireAt": { $gt: Date.now() },
  });
  if (!user) {
    req.session.message =
      "Invalid or expired verification link. Please input your username and email again for new verification email.";
    return res.redirect("/user/signup");
  }
  user.verified = true;
  await user.save();
  req.session.user = { username: user.username, email: user.email };
  req.session.message = null;
  res.redirect("/user/signup");
});

// route for login
router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.render("login", {
      username: req.session.user.username,
      email: req.session.user.email,
      password: req.session.user.password,
      message: req.session.message,
    });
  }
  res.render("login");
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // rerender login page if input imcomplete
  if (!email || !password) {
    return res.render("login", {
      message: "Email and password are required to log in.",
    });
  }

  // rerender login page if email incorrect
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("login", {
      message: "Email or password incorrect.",
    });
  }

  // rerender login page if password incorrect
  const match = await bcrypt.compare(password, user.hashedPassword);
  if (!match) {
    return res.render("login", {
      message: "Email or password incorrect.",
    });
  }

  // redirect to / with user info stored in req.session
  user.lastLogin = Date.now();
  await user.save();
  req.session.user = { username: user.username, email, password };
  res.redirect("/");
});

// route for reseting password
router.get("/resetPassword", (req, res) => {
  res.render("resetPassword");
});

router.post("/resetPassword", async (req, res) => {
  const { email } = req.body;
  // rerender resetPassword page of input data imcomplete
  if (!email) {
    return res.render("resetPassword", {
      message: "Email is required.",
    });
  }

  // no user with provided email => rerender resetPassword page
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("resetPassword", {
      message: "This email hasn't been registered.",
    });
  }

  if (
    typeof user.resetPassword.token !== "undefined" &&
    user.resetPassword.expireAt > Date.now()
  ) {
    return res.render("resetPassword", {
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
        <h4>Please click the link below to reset your pasword:</h4>
        <a href="${resetPasswordLink}">${resetPasswordLink}</a>`,
  };
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error(error);
    } else {
      console.log("Email sent: ", info.response);
    }
  });

  res.render("resetPassword", {
    message: `Password reseting email has been sent to your email (${user.email}).`,
  });
});

router.put("/resetPassword", async (req, res) => {
  const { email, newPassword, confirmNewPassword } = req.body;
  // rerender password reseting page if input data imcomplete
  if (!email || !newPassword || !confirmNewPassword) {
    return res.render("resetPassword", {
      email: email,
      message:
        "Email, new password and confirming new password are all required.",
    });
  }

  // resetPassword and confirmNewPassword don't match => rerender password reseting page
  if (newPassword !== confirmNewPassword) {
    return res.render("resetPassword", {
      email: email,
      message: "New passwords DON'T match.",
    });
  }

  // check if user with that email exists
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("resetPassword", {
      email: email,
      message: "No such use with that email.",
    });
  }

  // new psswords match => redirect to /user/login
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);
  user.hashedPassword = hashedNewPassword;
  await user.save();
  req.session.user = { username: user.username, email, password: newPassword };
  return res.redirect("/user/login");
});

// route for verify password reset link
router.get("/resetPassword/:token", async (req, res) => {
  const { token } = req.params;
  const user = await User.findOne({
    "resetPassword.token": token,
    "resetPassword.expireAt": { $gt: Date.now() },
  });
  console.log(user);
  if (!user) {
    req.session.message =
      "Invalid or expired password reset link. Enter email and get a new one.";
    return res.redirect("/user/resetPassword");
  }
  res.render("resetPassword", { email: user.email, message: null });
});

router.get("/logout", async (req, res) => {
  // update user.lastLogout before logout
  try {
    const user = await User.findOne({ email: req.session.user.email });
    user.lastLogout = Date.now();
    await user.save();
  } catch (error) {
    console.error(error);
  }

  // destroy session and redirect to previous page
  req.session.destroy((error) => {
    if (error) {
      console.error("Error logging out: ", error);
    }
  });
  const redirectTo = req.get("referer") || "/";
  res.redirect(redirectTo);
});

module.exports = router;
