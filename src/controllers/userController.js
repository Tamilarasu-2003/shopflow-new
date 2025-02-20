const jwt = require("jsonwebtoken");

const passport = require("passport");
const passwordServices = require("../services/passwordServices");
const authServices = require("../services/authServices");
const userModel = require("../models/userModel");
const s3util = require("../utils/s3util");
const { sendResponse } = require("../utils/responseHandler");
const emailService = require("../services/emailServices");

const signup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await userModel.findUserByEmail(email);

    if (existingUser) {
      const { password: _, ...userWithoutPassword } = existingUser;
      return sendResponse(res, {
        status: 409,
        type: "error",
        message: `User with email ${email} already exists.`,
        data: userWithoutPassword,
      });
    }

    const hashedPassword = await passwordServices.hashPassword(password);

    const newUser = await userModel.createUser({
      name: name,
      email: email,
      password: hashedPassword,
      phone: phone,
    });

    const { password: _, ...userWithoutPassword } = newUser;
    sendResponse(res, {
      status: 201,
      type: "success",
      message: "User created successfully.",
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Error creating user.",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const existingUser = await userModel.findUserByEmail(email);

    if (!existingUser) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    const hashCompare = await passwordServices.hashCompare(
      password,
      existingUser.password
    );

    if (!hashCompare) {
      return sendResponse(res, {
        status: 401,
        type: "error",
        message: "Password authentication failed.",
      });
    }

    let token = await authServices.createToken({
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    });

    const { password: _, ...userWithoutPassword } = existingUser;

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Login successful",
      data: {
        ...userWithoutPassword,
        profile_pic: userWithoutPassword.image,
      },
      token: token,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Login error, please try again later.",
      error: error.message,
    });
  }
};

const oAuth = async (req, res) => {
  try {
    const { id, name, email, image, ...data } = req.body;
    console.log("req.body : ", req.body);

    let user = await userModel.findUserByGoogleId(id);
    if (!user) {
      const randomPassword = await passwordServices.generateRandomPassword();
      const hashedPassword = await passwordServices.hashPassword(
        randomPassword
      );
      user = await userModel.createUser({
        googleId: id,
        email: email,
        name: name,
        profilePicture: image,
        password: hashedPassword,
      });
    }

    const existingUser = await userModel.findUserByEmail(email);

    let token = await authServices.createToken({
      id: existingUser.id,
      name: existingUser.name,
      email: existingUser.email,
    });

    const { password: _, ...userWithoutPassword } = existingUser;

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Login successful",
      data: userWithoutPassword,
      token: token,
    });
  } catch (error) {
    console.error(error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Login error, please try again later.",
      error: error.message,
    });
  }
};

const googleLogin = passport.authenticate("google", {
  scope: ["profile", "email"],
});

const googleCallback = (req, res, next) => {
  passport.authenticate("google", { failureRedirect: `${process.env.FRONTEND_URL}/login` }, async (err, user) => {
    if (err || !user) {
      console.log("Google Authentication Failed:", err);
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    try {
      const userData = user._json;
      console.log("Authenticated User Data:", userData);

      let existingUser = await userModel.findUserByGoogleId(userData.sub);
      if (!existingUser) {
        const randomPassword = await passwordServices.generateRandomPassword();
        const hashedPassword = await passwordServices.hashPassword(randomPassword);

        existingUser = await userModel.createUser({
          googleId: userData.sub,
          email: userData.email,
          name: userData.name,
          profilePicture: userData.picture,
          password: hashedPassword,
        });
      }

      existingUser = await userModel.findUserByEmail(existingUser.email);
      console.log("Existing User:", existingUser);

      const token = await authServices.createToken({
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
      });

      res.cookie("shopflow_session", JSON.stringify({ token }), {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        // httpOnly: true,
        // secure: true,
        // sameSite: "None",
      });

      return res.redirect(`${process.env.FRONTEND_URL}`);
    } catch (error) {
      console.error("Error Handling Google OAuth:", error);
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
  })(req, res, next);
};


const userProfileInfo = async (req, res) => {
  const userId = req.user.id;

  if (!userId) {
    return sendResponse(res, {
      status: 404,
      type: "error",
      message: "User id required.",
    });
  }

  const existingUser = await userModel.findUserById(userId);

  if (!existingUser) {
    return sendResponse(res, {
      status: 404,
      type: "error",
      message: "User not found.",
    });
  }

  sendResponse(res, {
    status: 200,
    type: "success",
    data: {
      name: existingUser.name,
      email: existingUser.email,
      phone: existingUser.phone,
      profile_pic: existingUser.image,
    },
  });
};

const updateUserProfile = async (req, res) => {
  try {
    let image = req.file;
    const data = req.body;
    const userId = req.user.id;

    const { name, phone } = data;

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    if (phone) {
      const existingUser = await userModel.checkExistingPhone(phone, userId);

      if (existingUser) {
        return sendResponse(res, {
          status: 400,
          type: "error",
          message: "Email or phone already exists for another user.",
        });
      }
    }

    if (image) {
      const fileName = `profile-images/${userId}-${Date.now()}.jpg`;
      var imageUrl = await s3util.uploadToS3(image, fileName);
      console.log("imageUrl : ", imageUrl);
    }

    const updatedUser = await userModel.updateUser(userId, {
      ...(name && { name }),
      ...(phone && { phone }),
      ...(image && { image: imageUrl }),
    });

    console.log("User: ", updatedUser);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Profile Updated",
      data: {
        ...updatedUser,
        profile_pic: updatedUser.image,
      },
    });
  } catch (error) {
    console.error("Error updating user profile:", error);

    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in updateUserProfile",
      error: error,
    });
  }
};

const addAddress = async (req, res) => {
  try {
    const { street, city, state, country, zip, isPrimary } = req.query;
    const booleanValue = isPrimary === "true" ? true : false;
    const userId = req.user.id;

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    if (booleanValue) {
      await userModel.setAllAddressesToNonPrimary(userId);
    }

    const newAddress = await userModel.createAddress(
      street,
      city,
      state,
      country,
      zip
    );

    await userModel.linkAddressToUser(userId, newAddress.id, booleanValue);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Add Address successfully completed.",
    });
  } catch (error) {
    console.error("Error adding address:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in addAddress",
      error: error,
    });
  }
};

const makePrimaryAddress = async (req, res) => {
  try {
    const { addressId } = req.query;
    const userId = req.user.id;

    const addressOnUser = await userModel.findUserAddress(userId, addressId);

    if (!addressOnUser) {
      throw new Error("Address not found or does not belong to the user.");
    }

    await userModel.setAllAddressesToNonPrimary(userId);

    await userModel.setPrimaryAddress(addressOnUser.id);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Address marked as primary successfully.",
    });
  } catch (error) {
    console.error("Error making address primary:", error);

    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error in makePrimaryAddress",
    });
  }
};

const editAddress = async (req, res) => {
  try {
    const { addressId, street, city, state, country, zip, isPrimary } =
      req.query;
    const userId = req.user.id;
    const booleanValue = isPrimary === "true" ? true : false;
    const addressData = { street, city, state, country, postalCode: zip };

    await userModel.updateAddress(addressId, addressData);

    if (booleanValue) {
      await userModel.setAllAddressesToNonPrimary(userId);
    }

    await userModel.setPrimaryAddress(addressId, booleanValue);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Address update successfully.",
    });
  } catch (error) {
    console.error("Error editing address:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error while editAddress.",
    });
  }
};

const deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.query;
    const userId = req.user.id;

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    const addressOnUser = await userModel.findUserAddress(userId, addressId);

    if (!addressOnUser) {
      throw new Error("Address not found or does not belong to the user.");
    }

    await userModel.deleteAddress(addressId);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "deletion successful....",
    });
  } catch (error) {
    console.error("Error adding address:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error",
    });
  }
};

const getAllAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "User ID is required.",
      });
    }

    const userAddresses = await userModel.findAllUserAddresses(userId);

    if (!userAddresses.length) {
      return sendResponse(res, {
        status: 200,
        type: "success",
        message: "No addresses found for this user.",
        data: [],
      });
    }

    const addresses = userAddresses
      .map((userAddress) => ({
        id: userAddress.address.id,
        userId: userAddresses[0].userId,
        street: userAddress.address.street,
        city: userAddress.address.city,
        state: userAddress.address.state,
        country: userAddress.address.country,
        zip: userAddress.address.postalCode,
        isPrimary: !!userAddress.isPrimary,
      }))
      .sort((a, b) => b.isPrimary - a.isPrimary);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Addresses retrieved successfully.",
      data: addresses,
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.query;

  try {
    const user = await userModel.findUserByEmail(email);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    let resetToken = await authServices.resetToken({
      id: user.id,
      name: user.name,
      email: user.email,
    });

    const resetURL = `${process.env.FRONTEND_URL}/user/forgetpwd/resetpwd?token=${resetToken}`;

    await emailService.sendPasswordResetEmail(email, resetURL);

    sendResponse(res, {
      status: 404,
      type: "error",
      message: "Password reset link sent to your email.",
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

const resetPassword = async (req, res) => {
  const { token, newPassword } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_TOKEN);

    const user = await await userModel.findUserByEmail(decoded.email);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await userModel.updateUserPassword(user.email, hashedPassword);

    sendResponse(res, {
      status: 200,
      success: true,
      message: "Password successfully reset.",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      sendResponse(res, {
        status: 500,
        type: "error",
        message: "Reset token has expired.",
        error: error.message,
      });
    }
    if (error.name === "JsonWebTokenError") {
      sendResponse(res, {
        status: 500,
        type: "error",
        message: "Invalid reset token.",
        error: error.message,
      });
    }

    console.error("Error resetting password:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal Server Error",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  oAuth,
  forgotPassword,
  resetPassword,
  userProfileInfo,
  updateUserProfile,
  addAddress,
  makePrimaryAddress,
  getAllAddresses,
  editAddress,
  deleteAddress,
  googleLogin,
  googleCallback,
};
