require("dotenv").config();


const express = require("express");

const passport = require("passport");
const session = require("express-session");
require('./src/utils/passport');
const authRoutes = require("./src/services/oaut");


const productRoute = require("./src/routes/productRoute");
const userRoute = require("./src/routes/userRoute");
const cartRoute = require('./src/routes/cartRoute');
const wishlistRoute = require('./src/routes/wishlistRoute');
const orderRoutes = require('./src/routes/orderRoute')
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: ["https://shopflow-current.vercel.app/", "http://localhost:3000"], // Allow both production and development
    credentials: true, // Allow sending cookies
  })
);

// app.get("/", (req, res) => {
//   res.send("hello....!");
// });

app.use("/products", productRoute);
app.use("/user", userRoute);
app.use("/user/cart", cartRoute);
app.use("/user/wishlist", wishlistRoute);
app.use('/user/order', orderRoutes);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set true in production with HTTPS
  })
);
app.use(passport.initialize());
app.use(passport.session());
// app.use("/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("Google OAuth 2.0 Implementation");
});

app.listen(5000, () => {
  console.log("backend running successfully....");
});
