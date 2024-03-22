// check if running in the production environment
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// import modules
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const session = require("express-session");

// import models
const User = require("./models/users");

// app setups
const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);

// users db
const users = [];
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to mongoose."));

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

// route for homepage
app.get("/", (req, res) => {
  if (req.session.user) {
    return res.render("index", {
      username: req.session.user.username,
    });
  }
  res.render("index");
});

// route for signup
app.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.render("signup", {
      username: req.session.user.username,
      email: req.session.user.email,
      message: req.session.message,
    });
  }
  res.render("signup", { message: req.session.message });
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // redirect to /signup if input imcomplete
    if (!username || !email || !password) {
      req.session.message = "Username, email and password are all required.";
      req.session.user = { username, email, password };
      return res.redirect("/signup");
    }

    // redirect to /signup if input incorrect
    const user = await User.findOne({ username, email });
    if (!user) {
      req.session.message = "No such user with the username and email.";
      return res.redirect("/signup");
    }

    // Update the hashedPassword property if user exists
    const hashedPassword = await bcrypt.hash(password, 10);
    user.hashedPassword = hashedPassword;
    await user.save();
    req.session.user = { username, email, password };
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    return res.redirect("/");
  }
});

// route for email verification
app.post("/verify", (req, res) => {
  try {
    // check whether username and email are valid
    const { username, email } = req.body;
    if (!username || !email) {
      req.session.message =
        "Username and email are required for email verification.";
      return res.redirect("/signup");
    }

    // generate token
    const verificationToken = uuidv4();

    // send verification email
    const verificationLink = `http://localhost:3000/verify/${verificationToken}`;
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

    // create user
    const user = User.create({
      username,
      email,
      verified: false,
      verificationToken,
    });

    // redirecrt the user to /signup with check mail message
    req.session.message = `Please check your email (${email}) for verification.`;
    console.log(req.session);
    res.redirect("/signup");
  } catch (error) {
    console.error(error);
    req.session.message = "Internal sever error.";
    res.redirect("/signup");
  }
});

// route for email verification
app.get("/verify/:token", async (req, res) => {
  const token = req.params.token;
  const user = await User.findOne({ verificationToken: token });
  if (!user) {
    req.session.message = "Invalid verification token.";
    return res.redirect("/signup");
  }
  user.verified = true;
  await user.save();
  req.session.user = { username: user.username, email: user.email };
  req.session.message = null;
  res.redirect("/signup");
});

// route for login
app.get("/login", (req, res) => {
  if (req.session.user) {
    return res.render("login", {
      username: req.session.user.username,
      email: req.session.user.email,
      password: req.session.user.password,
    });
  }
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  // redirect to /login if input imcomplete
  if (!email || !password) {
    req.session.message = "Email and password are required to log in.";
    return res.redirect("/login");
  }

  // redirect to /login if email incorrect
  const user = await User.findOne({ email: email });
  if (!user) {
    req.session.message = "This email hasn't been verified.";
    return res.redirect("/login");
  }

  // redirect to /login if password incorrect
  const match = await bcrypt.compare(password, user.hashedPassword);
  if (!match) {
    req.session.message = "Password incorrect.";
    return res.redirect("/login");
  }

  // redirect to / with user info stored in req.session
  req.session.user = { username: user.username, email, password };
  res.redirect("/");
});

app.get("/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) {
      console.error("Error logging out: ", error);
    }
  });
  const redirectTo = req.get("referer") || "/";
  res.redirect(redirectTo);
});

app.listen(3000);
