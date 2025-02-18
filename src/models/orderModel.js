const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createOrder = async (userId, orderItems, totalAmount) => {
  return await prisma.order.create({
    data: {
      userId,
      totalAmount: parseFloat(totalAmount),
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      orderDate: new Date(),
      items: {
        create: orderItems,
      },
    },
    include: {
      items: {
        include: { product: true },
      },
    },
  });
};

const updateOrderStatus = async (orderId) => {
  return await prisma.order.update({
    where: { id: parseInt(orderId) },
    data: {
      paymentStatus: "COMPLETED",
      orderStatus: "CONFIRMED",
    },
  });
};

const getOrderById = async (orderId) => {
  return await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: { items: true },
  });
};

const updateOrderPayment = async (orderId, paymentId) => {
  return await prisma.order.update({
    where: { id: parseInt(orderId) },
    data: {
      paymentStatus: "PENDING",
      paymentId: paymentId,
      updatedAt: new Date(),
    },
  });
};

const updateOrderPaymentStatus = async (orderId, paymentId) => {

  return await prisma.order.update({
    where: { id: parseInt(orderId) },
    data: {
      paymentStatus: "COMPLETED",
      orderStatus: "CONFIRMED",
      paymentId,
    },
  });
};

const getOrderWithItems = async (orderId) => {
  return await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: { items: true },
  });
};

const markOrderAsFailed = async (orderId) => {
  await prisma.orderedItem.updateMany({
    where: { orderId: parseInt(orderId) },
    data: {
      paymentStatus: "FAILED",
      orderStatus: "FAILED",
    },
  });

  return await prisma.order.update({
    where: { id: parseInt(orderId) },
    data: {
      paymentStatus: "FAILED",
      orderStatus: "FAILED",
    },
  });
};

const getConfirmedUserOrders = async (userId) => {
  return await prisma.order.findMany({
    where: {
      userId: parseInt(userId),orderStatus: "CONFIRMED",
    },
    include: {
      items: {
        select: {
          id: true,
          product: true,
          quantity: true,
          price: true,
        },
      },
    },
  });
};

const cancelOrderById = async (orderId) => {
  try {
    return await prisma.order.update({
      where: { id: parseInt(orderId) },
      data: { orderStatus: "CANCELLED" },
    });
  } catch (error) {
    throw new Error('Error cancelling order: ' + error.message);
  }
};

const cancelProductInOrder = async (orderId, productId) => {
  return await prisma.orderedItem.deleteMany({
    where: { orderId, productId },
  });
}

const getOrderByOrderId = async (orderId) => {
  return await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: { items: { include: { product: true } } },
  });
};

const getSimilarProducts = async (subCategoryId, productId) => {
  return await prisma.product.findMany({
    where: {
      subCategoryId: parseInt(subCategoryId),
      id: { not: parseInt(productId) },
    },
    select: {
      id: true,
      name: true,
      image: true,
      description: true,
      actualPrice: true,
      offerPrice: true,
      discountPercentage: true,
      subCategoryId: true,
      rating: true,
    },
  });
};

const getOrderForCheckoutById = async (orderId) => {
  return await prisma.order.findUnique({
    where: {
      id: parseInt(orderId),
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
};


module.exports = {
  createOrder,
  
  updateOrderStatus,
  getOrderById,
updateOrderPayment,
updateOrderPaymentStatus,
getOrderWithItems,
markOrderAsFailed,
getConfirmedUserOrders,
cancelOrderById,
cancelProductInOrder,
getOrderByOrderId,
getSimilarProducts,
getOrderForCheckoutById
};
