// const express = require("express");
// const passport = require("passport");
// const jwt = require("jsonwebtoken");
// const router = express.Router();
// const userModel = require("../models/userModel");
// const passwordServices = require("../services/passwordServices");
// const authServices = require("../services/authServices");



// // Google OAuth Login Route
// router.get(
//   "/google",
//   passport.authenticate("google", { scope: ["profile", "email"] })
// );

// // Google OAuth Callback Route (Fixed)
// router.get(
//   "/google/callback",
//   passport.authenticate("google", { failureRedirect: "http://localhost:3000/login" }),
//   async (req, res) => {
//     if (!req.user) {
//       return res.redirect("http://localhost:3000/login");
//     }

//     const user = req.user._json;
//     console.log("user : ",user.email)
//     let existingUser = await userModel.findUserByGoogleId(user.sub);
//     if (!existingUser) {
//           const randomPassword = await passwordServices.generateRandomPassword();
//           const hashedPassword = await passwordServices.hashPassword(
//             randomPassword
//           );
//           user = await userModel.createUser({
//             googleId: user.sub,
//             email: user.email,
//             name: user.name,
//             profilePicture: user.picture,
//             password: hashedPassword,
//           });
//         }

//       existingUser = await userModel.findUserByEmail(user.email);
//       console.log("existingUser : ",existingUser);
  
//     let token = await authServices.createToken({
//           id: existingUser.id,
//           name: existingUser.name,
//           email: existingUser.email,
//         // });
    
//     // Set token in HTTP-only Cookie
//     res.cookie("shopflow_session", JSON.stringify({token}), {
//       // httpOnly: true,  // Prevents JavaScript access (XSS protection)
//       // secure: process.env.NODE_ENV === "production",  // Ensures secure cookie in production
//       // sameSite: "Strict",  // Prevents CSRF attacks
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     // Redirect user back to frontend
//     res.redirect("http://localhost:3000/");
//   }
// );

// // Get Current User
// router.get("/current-user", (req, res) => {
//   const token = req.cookies.auth_token;

//   if (!token) {
//     return res.status(401).json({ message: "Unauthorized" });
//   }

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     res.json({ id: decoded.id, email: decoded.email });
//   } catch (error) {
//     res.status(401).json({ message: "Invalid token" });
//   }
// });

// // Logout Route (Clears Cookie)
// router.get("/logout", (req, res) => {
//   res.clearCookie("auth_token");
//   res.redirect("http://localhost:3000/login");
// });

// module.exports = router;
