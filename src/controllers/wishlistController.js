const userModel = require('../models/userModel');
const productModel = require('../models/productModel');
const wishlistModel = require('../models/wishlistModel');
const { sendResponse } = require("../utils/responseHandler");

const addOrRemoveItem = async (req, res) => {
  try {
    const { productId } = req.query;
    console.log("productId : ",productId);

    const userId  = req.user.id;
    console.log("userId : ",userId);
    

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status:404,
        type:"error",
        message:"user not found.",
      })
    }

    const product = await productModel.fetchProductById(productId);

    if (!product) {
      return sendResponse(res, {
        status:404,
        type:"error",
        message:"Product not found.",
      })
    }

    let wishlist = await wishlistModel.findUserWishlist(userId);

    if (!wishlist) {
      wishlist = await wishlistModel.createWishlist(userId,productId)

      sendResponse(res, {
        status:201,
        type:"success",
        message: "Product added to wishlist.",
        data:wishlist,
      })
    }

    const productInWishlist = await wishlistModel.findProductInWishlist( wishlist.id, productId );

    if (productInWishlist) {
      await wishlistModel.removeProductFromWishlist(productInWishlist.id);
  
      sendResponse(res, {
        status:200,
        type:"success",
        message:"Product removed from wishlist.",
      })
    } else {
      await wishlistModel.addProductToWishlist(wishlist.id, productId);
   
      sendResponse(res, {
        status:200,
        type:"success",
        message:"Product added to wishlist.",
      })
    }
  } catch (error) {
    console.error("Error handling wishlist:", error);
   
    sendResponse(res, {
      status:500,
      type:"error",
      message:"Internal server error in wishlist"
    })
  }
};

const viewWishlist = async (req, res) => {
  try {
    const userId  = req.user.id;

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    let wishlist = await wishlistModel.userWishlist(userId)

    if (!wishlist) {
      sendResponse(res, {
        status: 404,
        type: "error",
        message: "wishlist is empty.",
      });
    }

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "wishlist items fetched successfully",
      data: wishlist,
    });
  } catch (error) {
    console.error("Error handling wishlist:", error);
    sendResponse(res, {
      status:500,
      type:"error",
      message:"Internal server error in view Wishlist."
    })
  }
};

module.exports = { addOrRemoveItem, viewWishlist };