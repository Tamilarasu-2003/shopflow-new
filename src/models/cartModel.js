const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const findCartByUserId = async (userId) => {
  return await prisma.cart.findUnique({
    where: { userId: parseInt(userId) },
    include: {
      items: {
        orderBy: { createdAt: "desc" },
        include: {
          product: true,
        },
      },
    },
  });
};

const findUserCart = async (userId) => {
  return await prisma.cart.findUnique({
    where: { userId: parseInt(userId) },
    include: { items: true },
  });
};

const createUserCart = async (userId, product, quantity, totalPrice) => {
  return await prisma.cart.create({
    data: {
      userId: parseInt(userId),
      totalAmount: totalPrice,
      items: {
        create: [
          {
            productId: product.id,
            quantity: parseInt(quantity),
            totalPrice: totalPrice,
          },
        ],
      },
    },
  });
};

const updateCartItem = async (existingCartItem, quantity, totalPrice) => {
  return await prisma.cartItem.update({
    where: { id: existingCartItem.id },
    data: {
      quantity: existingCartItem.quantity + parseInt(quantity),
      totalPrice: totalPrice,
    },
  });
};

const updateUserCartTotal = async (userId, totalAmount) => {
  return await prisma.cart.update({
    where: { userId: parseInt(userId) },
    data: {
      totalAmount: totalAmount,
    },
  });
};

const addNewCartItem = async (cartId, productId, quantity, totalPrice) => {
  return await prisma.cartItem.create({
    data: {
      cartId: cartId,
      productId: parseInt(productId),
      quantity: parseInt(quantity),
      totalPrice: totalPrice,
    },
  });
};

const getProductsByIds = async (productIds) => {
  return prisma.product.findMany({
    where: { id: { in: productIds } },
  });
};

const deleteCartItem = async (userId, productId, cart, existingCartItem) => {
  return await prisma.cart.update({
    where: {
      userId: parseInt(userId),
    },
    data: {
      totalAmount: cart.totalAmount - existingCartItem.totalPrice,
      items: {
        deleteMany: {
          productId: parseInt(productId),
        },
      },
    },
    include: {
      items: true,
    },
  });
};

const updateCartCount = async (cart, cartItem, newTotalPrice, newQuantity) => {
  return await prisma.cart.update({
    where: { id: cart.id },
    data: {
      totalAmount: parseFloat(
        (cart.totalAmount + (newTotalPrice - cartItem.totalPrice)).toFixed(2)
      ),
      items: {
        update: {
          where: { id: cartItem.id },
          data: {
            quantity: parseInt(newQuantity),
            totalPrice: newTotalPrice,
          },
        },
      },
    },
    include: { items: true },
  });
};

module.exports = {
  findCartByUserId,
  findUserCart,
  createUserCart,
  updateCartItem,
  updateUserCartTotal,
  addNewCartItem,
  getProductsByIds,
  deleteCartItem,
  updateCartCount,
};
