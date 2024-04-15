// check if running in the production environment
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// import modules
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const methodOverride = require("method-override");
const flash = require("express-flash");

// app setups
const app = express();
app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set("layout", "layouts/layout");
app.use(expressLayouts);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(methodOverride("_method"));
app.use(
  session({
    secret: "secret",
    resave: false,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  res.locals.message = req.flash("message");
  res.locals.user = req.user;
  res.locals.seller = req.seller;
  next();
});

// users db
const users = [];
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to mongoose."));

// import routers
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const sellerRouter = require("./routes/seller");
const productRouter = require("./routes/product");
const cartRouter = require("./routes/cart");
const checkoutRouter = require("./routes/checkout");

// use routers
app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/seller", sellerRouter);
app.use("/product", productRouter);
app.use("/cart", cartRouter);
app.use("/checkout", checkoutRouter);

app.listen(3000);
