const userModel = require('../models/userModel');
const productModel = require('../models/productModel');
const cartModel = require('../models/cartModel');
const { sendResponse } = require("../utils/responseHandler");

const addItemToCart = async (req, res) => {
  const { productId, quantity } = req.query;
  const userId  = req.user.id;

  try {
    const product = await productModel.fetchProductById(productId);

    if (!product) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Product not found.",
      });
    }

    let totalPrice = parseInt(quantity) * product.offerPrice;

    if (quantity > product.stock) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Requested quantity exceeds available stock.",
      });
    }

    let cart = await cartModel.findUserCart(userId);

    if (!cart) {
      cart = await cartModel.createUserCart(userId, product, quantity, totalPrice);

      return sendResponse(res, {
        status: 201,
        type: "success",
        message: "Cart created, and item added successfully.",
        data: cart,
      });
    }

    const existingCartItem = cart.items.find( (item) => item.productId === parseInt(productId) );

    if (existingCartItem) {
      totalPrice = existingCartItem.totalPrice + parseInt(quantity) * product.offerPrice;
      const updatedCartItem = await cartModel.updateCartItem(existingCartItem, quantity, totalPrice);

      let cartTotalAmount = cart.totalAmount + parseInt(quantity) * product.offerPrice

      await cartModel.updateUserCartTotal(userId,cartTotalAmount);

      return sendResponse(res, {
        status: 200,
        type: "success",
        message: "Cart item quantity updated successfully.",
        data: updatedCartItem,
      });
    };

    const newCartItem = await cartModel.addNewCartItem(cart.id, productId, quantity, totalPrice)

    let cartTotalAmount = cart.totalAmount + parseInt(quantity) * product.offerPrice

    await cartModel.updateUserCartTotal(userId,cartTotalAmount);

    sendResponse(res, {
      status: 201,
      type: "success",
      message: "Item added to cart successfully.",
      data: newCartItem,
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
    });
  }
};

const addItemsToCart = async (req, res) => {
  const { items } = req.body;
  const userId  = req.user.id;

  if (!Array.isArray(items) || items.length === 0) {
    return sendResponse(res, {
      status: 400,
      type: "error",
      message: "Invalid or missing items array.",
    });
  }

  try {
    const productIds = items.map((item) => parseInt(item.productId));
    const products = productModel.getMultipleProductsByIds(productIds);

    if (products.length !== items.length) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "One or more products not found.",
      });
    }

    for (const item of items) {
      const product = products.find((p) => p.id === parseInt(item.productId));
      if (!product || item.quantity > product.stock) {
        return sendResponse(res, {
          status: 400,
          type: "error",
          message: `Requested quantity for product ID ${item.productId} exceeds available stock.`,
        });
      }
    }

    let cart = await cartModel.findUserCart(userId);

    if (!cart) {
      cart = await prisma.cart.create({
        data: {
          userId: parseInt(userId),
          totalAmount: 0,
        },
      });
    }

    let updatedTotalAmount = cart.totalAmount;

    for (const item of items) {
      const product = products.find((p) => p.id === parseInt(item.productId));
      const itemTotalPrice = product.offerPrice * parseInt(item.quantity);

      const existingCartItem = cart.items.find(
        (cartItem) => cartItem.productId === product.id
      );

      if (existingCartItem) {
        await prisma.cartItem.update({
          where: { id: existingCartItem.id },
          data: {
            quantity: existingCartItem.quantity + parseInt(item.quantity),
            totalPrice: existingCartItem.totalPrice + itemTotalPrice,
          },
        });

        updatedTotalAmount += itemTotalPrice;
      } else {
        await prisma.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            quantity: parseInt(item.quantity),
            totalPrice: itemTotalPrice,
          },
        });

        updatedTotalAmount += itemTotalPrice;
      }
    }

    await prisma.cart.update({
      where: { id: cart.id },
      data: { totalAmount: updatedTotalAmount },
    });

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Items added to cart successfully.",
    });
  } catch (error) {
    console.error("Error adding items to cart:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
    });
  }
};

const viewCart = async (req, res) => {
  const userId  = req.user.id;

  const user = await userModel.findUserById(userId);

  if (!user) {
    return sendResponse(res, {
      status: 404,
      type: "error",
      message: "User not found.",
    });
  }

  const cart = await cartModel.findCartByUserId(userId);

  if (!cart) {
    return sendResponse(res, {
      status: 404,
      type: "error",
      message: "cart is empty.",
    });
  }

  sendResponse(res, {
    status: 200,
    type: "success",
    message: "cart items fetched successfully",
    data: cart,
  });
};

const deleteFromCart = async (req, res) => {
  try {
    const { productId } = req.query;
    const userId  = req.user.id;

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    const cart = await cartModel.findUserCart(userId);

    if (!cart) {
      sendResponse(res, {
        status: 404,
        type: "error",
        message: "cart is empty.",
      });
    }

    const indexFound = cart.items.findIndex(
      (item) => item.productId == productId
    );

    const existingCartItem = cart.items.find(
      (item) => item.productId === parseInt(productId)
    );

    if (indexFound == -1) {
      sendResponse(res, {
        status: 404,
        type: "error",
        message: "Product not found in cart.",
      });
    }

    const updatedCart = await cartModel.deleteCartItem(userId, productId, cart, existingCartItem);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Product removed from the cart.",
      data: updatedCart,
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
    });
  }
};

const updateCartItemCount = async (req, res) => {
  try {
    const userId  = req.user.id;
    const { productId, operation } = req.query;

    if (!["increase", "decrease"].includes(operation)) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Invalid operation. Use 'increase' or 'decrease'.",
      });
    }

    const product = await productModel.fetchProductById(productId);

    if (!product) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Product not found.",
      });
    }

    const user = await userModel.findUserById(userId);

    if (!user) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });
    }

    const cart = await cartModel.findUserCart(userId);

    if (!cart) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Cart not found.",
      });
    }

    const cartItem = cart.items.find(
      (item) => item.productId === parseInt(productId)
    );

    if (!cartItem) {
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "Product not found in cart.",
      });
    }

    let newQuantity =
      operation === "increase" ? cartItem.quantity + 1 : cartItem.quantity - 1;

    if (newQuantity < 1) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Quantity cannot be less than 1.",
      });
    }

    let newTotalPrice = newQuantity * product.offerPrice;

    await cartModel.updateCartCount(cart, cartItem, newTotalPrice, newQuantity);

    const cartData = cartModel.findCartByUserId(userId)
    // await prisma.cart.findUnique({
    //   where: { userId: parseInt(userId) },
    //   include: {
    //     items: {
    //       orderBy: { createdAt: "desc" },
    //       include: {
    //         product: true,
    //       },
    //     },
    //   },
    // });

    sendResponse(res, {
      status: 200,
      type: "success",
      message: `Cart item count ${
        operation === "increase" ? "increased" : "decreased"
      }.`,
      data: cartData,
    });
  } catch (error) {
    console.error("Error updating cart item count:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
    });
  }
};

module.exports = {
  addItemToCart,
  addItemsToCart,
  viewCart,
  deleteFromCart,
  updateCartItemCount,
};
