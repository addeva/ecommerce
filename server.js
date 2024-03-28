// check if running in the production environment
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

// import modules
const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const session = require("express-session");
const methodOverride = require("method-override");

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

// users db
const users = [];
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to mongoose."));

// import routers
const indexRouter = require("./routes/index");
const userRouter = require("./routes/user");
const productRouter = require("./routes/product");

// use routers
app.use("/", indexRouter);
app.use("/user", userRouter);
app.use("/product", productRouter);

app.listen(3000);
