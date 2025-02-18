const userModel = require("../models/userModel");
const productModel = require("../models/productModel");
const orderModel = require('../models/orderModel');
const paymentService = require("../services/paymentServices");
const paymentModel = require('../models/paymentModel');
const emailService = require("../services/emailServices");



// const Razorpay = require("razorpay");
// const emailService = require("../services/emailServices");

// const Stripe = require("stripe");

// const { check, validationResult } = require("express-validator");
// const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

const razorpay = require("../utils/razorpay");
const { sendResponse } = require("../utils/responseHandler");

const createOrder = async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.id;

    const user = await userModel.findUserById(userId);

    if (!user)
      return sendResponse(res, {
        status: 404,
        type: "error",
        message: "User not found.",
      });

    let totalAmount = 0;
    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await productModel.fetchProductById(item.productId);
        if (!product)
          throw new Error(`Product with ID ${item.productId} not found.`);
        totalAmount += product.offerPrice * item.quantity;

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.offerPrice,
          // orderStatus: "PENDING",
          // paymentStatus: "PENDING",
        };
      })
    );

    totalAmount = parseFloat(totalAmount).toFixed(2)

    const orderData = await orderModel.createOrder(userId, orderItems, totalAmount);

    sendResponse(res, {
      status: 201,
      type: "success",
      message: "Order created successfully for summary.",
      data: orderData,
      totalAmount: totalAmount,
    });
  } catch (error) {
    console.error("Error creating temporary order:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error while creating order.",
    });
  }
};

const createPaymentIntent = async (req, res) => {
  try {
    console.log("createPaymentIntent started... ");
    
    const { totalAmount, currency = "usd" } = req.body;
    const userId = req.user.id;

    const paymentData = await paymentService.processPaymentIntent(
      userId,
      totalAmount,
      currency
    );

    console.log(" paymentData : ",paymentData);


    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Payment intent successfully created.",
      data: paymentData,
    });
  } catch (error) {
    console.error("Error creating payment intent:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error while creating PaymentIntent.",
    });
  }
};

const paymentMethodId = async (req, res) => {
  try {
    const { paymentIntentId } = req.query;

    if (!paymentIntentId) {
      return sendResponse(res, {
        status: 400,
        type: "error",
        message: "Missing paymentIntentId in request.",
      });
    }

    console.log("Received paymentIntentId:", paymentIntentId);

    const paymentMethodId = await paymentService.getPaymentMethodId(paymentIntentId);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Retrieved payment method ID successfully.",
      data: paymentMethodId,
    });
  } catch (error) {
    console.error("Error retrieving payment intent:", error.message);

    const status = error.type === "StripeInvalidRequestError" ? 400 : 500;
    const message = error.type === "StripeInvalidRequestError"
        ? "Invalid paymentIntentId or request parameters"
        : "Internal server error while retrieving payment details.";

    sendResponse(res, {
      status,
      type: "error",
      message,
      error: error.message,
    });
  }
};

const confirmPayment = async (req, res) => {
  console.log("confirmPayment start");

  const { orderId, paymentIntentId, paymentMethodId } = req.body;

  try {
    const paymentIntent = await paymentModel.retrievePaymentIntent(paymentIntentId);
    console.log("confirmPayment step 1");

    if (paymentIntent.status === "succeeded") {
      // await orderModel.updateOrderStatus(orderId);

      console.log("confirmPayment step 2");

      await orderModel.updateOrderStatus(orderId);

      console.log("confirmPayment step 3");

      const order = await orderModel.getOrderById(orderId);
      console.log("confirmPayment step 4");

      const user = await userModel.findUserById(order.userId);
      
      await emailService.orderUpdateEmail(user.email, order, "Placed");

      console.log("confirmPayment step 5");

      sendResponse(res, {
        status: 200,
        type: "success",
        message: "Payment verified and order updated",
        data: order,
      });
    } else {
      sendResponse(res, {
        status: 400,
        type: "success",
        message: "Payment failed",
        error: error,
      });
    }
  } catch (error) {
    console.error("Error confirming payment:", error.message);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Failed to confirm payment.",
      error: error,
    });
  }
};

const checkoutOrder = async (req, res) => {
  try {
    const { orderId } = req.query;

    console.log("orderId : ", orderId);

    const order = await orderModel.getOrderById(orderId);
    console.log("order : ",order);
    

    if ( !order || order.orderStatus !== "PENDING")  {
      return sendResponse(res,{
        status:400,
        type:"error",
        message:"Invalid order for checkout.",
      })
    }

    const razorpayOrder = await paymentModel.razorpayOrder(order.totalAmount);
    // razorpay.orders.create({
    //   amount: Math.ceil(order.totalAmount * 100),
    //   currency: "USD",
    //   receipt: `order_rcpt_${Date.now()}`,
    // });

    // await prisma.orderedItem.updateMany({
    //   where: {
    //     orderId: parseInt(orderId),
    //   },
    //   data: {
    //     paymentStatus: "PENDING",
    //     paymentId: razorpayOrder.id,
    //   },
    // });

    // const updatedOrder = await prisma.order.update({
    //   where: { id: parseInt(orderId) },
    //   data: {
    //     paymentStatus: "PENDING",
    //     paymentId: razorpayOrder.id,
    //     updatedAt: new Date(),
    //   },
    // });

    const updatedOrder = await orderModel.updateOrderPayment(orderId, razorpayOrder.id);

    console.log("updatedOrder : ", updatedOrder);

    res.status(200).json({
      success: true,
      message: "Checkout initiated successfully.",
      razorpayOrder,
      order: updatedOrder,
    });

    // sendResponse(res, {
    //   status:200,
    //   type:"success",
    //   message:"Checkout initiated successfully.",
    //   order: updatedOrder
    // })
  } catch (error) {
    console.error("Error in checkout:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Failed to checkout order.",
      error: error,
    });
  }
};

const verifyPaymentAndUpdateOrder = async (req, res) => {
  try {
    const { orderId, razorpayId, paymentId, paymentSignature } = req.query;
    console.log(orderId, razorpayId, paymentId, paymentSignature);

    if (!orderId || !razorpayId || !paymentId || !paymentSignature) {
      return sendResponse(res, { 
        status: 400, 
        type: "error", 
        message: "Missing required parameters." 
      });
    }

    // console.log("Verifying Payment:", {
    //   orderId,
    //   razorpayId,
    //   paymentId,
    //   paymentSignature,
    // });

    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET

    // const isValidSignature = Razorpay.validateWebhookSignature(
    //   razorpayId + "|" + paymentId,
    //   paymentSignature,
    //   process.env.RAZORPAY_KEY_SECRET
    // );

    const isValidSignature = paymentModel.isValidSignature(razorpayId, paymentId, paymentSignature, razorpaySecret)

    if (!isValidSignature) {
      return sendResponse(res, { status: 400, type: "error", message: "Invalid payment signature." });
    }

    // await prisma.orderedItem.updateMany({
    //   where: {
    //     orderId: parseInt(orderId),
    //   },
    //   data: {
    //     paymentStatus: "COMPLETED",
    //     orderStatus: "CONFIRMED",
    //     paymentId,
    //   },
    // });
    // 
    // 
    // 
    // await prisma.order.update({
    //   where: { id: parseInt(orderId) },
    //   data: {
    //     paymentStatus: "COMPLETED",
    //     orderStatus: "CONFIRMED",
    //     paymentId,
    //   },
    // });

    await orderModel.updateOrderPaymentStatus(orderId, paymentId);

    // const order = await prisma.order.findUnique({
    //   where: { id: parseInt(orderId) },
    //   include: {
    //     items: true,
    //   },
    // });

    const order = await orderModel.getOrderWithItems(orderId);


    // const user = await prisma.user.findUnique({
    //   where: { id: parseInt(order.userId) },
    // });

    const user = await userModel.findUserById(order.userId)


    await emailService.orderUpdateEmail(user.email, order, "Placed");

    res.status(200).json({
      success: true,
      message: "Payment verified and order updated.",
      order: order,
    });

    // sendResponse(res, {
    //   status:200,
    //   type:"success",
    //   message:"Payment verified and order updated.",
    //   order: order,
    // })
  } catch (error) {
    console.error("Error verifying payment:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Failed to verifying payment.",
      error: error,
    });  }
};

const failedPayment = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return sendResponse(res, { status: 400, type: "error", message: "Order ID is required." });
    }

    console.log("Deleting failed order:", { orderId });

    // const userOrder = await prisma.order.findUnique({
    //   where: { id: parseInt(orderId) },
    // });

    const userOrder = await orderModel.getOrderById(orderId);

    if (!userOrder) {
      return sendResponse(res, { status: 404, type: "error", message: "Order not found." });
    }

    if (userOrder.paymentStatus === "COMPLETED") {
      return sendResponse(res, { status: 400, type: "error", message: "Cannot update a completed order." });
    }

    // await prisma.orderedItem.updateMany({
    //   where: {
    //     orderId: parseInt(orderId),
    //   },
    //   data: {
    //     paymentStatus: "FAILED",
    //     orderStatus: "FAILED",
    //     paymentId,
    //   },
    // });

    // await prisma.order.update({
    //   where: { id: parseInt(orderId) },
    //   data: {
    //     paymentStatus: "FAILED",
    //     orderStatus: "FAILED",
    //     paymentId,
    //   },
    // });

    await orderModel.markOrderAsFailed(orderId);


    // const order = await prisma.order.findUnique({
    //   where: { id: parseInt(orderId) },
    //   include: {
    //     items: true,
    //   },
    // });

    const order = await orderModel.getOrderWithItems(orderId);


    // const user = await prisma.user.findUnique({
    //   where: { id: parseInt(order.userId) },
    // });

    const user = await userModel.findUserById(order.userId);



    await emailService.orderUpdateEmail(user.email, order, "Failed");

    res.status(200).json({
      success: true,
      message: "Payment verified and order updated.",
      order: order,
    });

    // sendResponse(res, {
    //   status: 200,
    //   type: "success",
    //   message: "Payment failed, order updated.",
    //   data: order,
    // });
  } catch (error) {
    console.error("Error deleting failed order:", error);
    sendResponse(res, { status: 500, type: "error", message: "Internal server error.", error: error.message });
  }
};

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const orders = await orderModel.getConfirmedUserOrders(userId);


    const data = orders.map((order) => ({
      orderDate: new Date(order.createdAt).toISOString().split("T")[0],
      total: order.totalAmount,
      items: order.items.map((item) => ({
        orderId: order.id,
        status: item.orderStatus,
        quantity: item.quantity,
        productName: item.product.name,
        productId: item.product.id,
        offerPrice: item.product.offerPrice,
        image: item.product.image,
      })),
    }));

    sendResponse(res, {
      status: 200,
      type: "success",
      data: [...data],
    });

    // res.status(200).json({ success: true, orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
      error: error.message,
    });  }
};

const cancelOrder = async (req, res) => {
  try {
    let { orderId, productId } = req.query;
    orderId = parseInt(orderId);
    productId = parseInt(productId);
    
    
    let updatedOrder
    if(productId){
      updatedOrder = await orderModel.cancelProductInOrder(orderId, productId);
    }else{
      updatedOrder = await orderModel.cancelOrderById(orderId);
    }
    
    console.log("updatedOrder : ",updatedOrder);
    

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully.",
      order: updatedOrder,
    });

    // sendResponse(res, {
    //   status:200,
    //   type:"success",
    //   message:"Order cancelled successfully.",
    //   data:updatedOrder,
    // })
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

const getOrderByOrderId = async (req, res) => {
  try {
    const { orderId } = req.query;
    console.log("getOrderByOrderId....");

    const order = await orderModel.getOrderByOrderId(orderId);


    if (!order) {
      console.error("order not found");
    }
    console.log("order : ", order);
    const date = new Date(order.orderDate).toISOString().split("T")[0];
    const subCategoryId = order.items[0].product.subCategoryId;
    const productId = order.items[0].product.id;

    const similarProducts = await orderModel.getSimilarProducts(subCategoryId, productId);


    sendResponse(res, {
      status: 200,
      type: "success",
      message: "Order Fetched Successfully.",
      data: {
        orderDate: date,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        product: order.items,
        similarProducts: similarProducts,
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    sendResponse(res, {
      status: 500,
      type: "error",
      message: "Internal server error.",
      error: error.message,
    });  }
};

const getOrderForCheckout = async (req, res) => {
  const { orderId } = req.query;
  if (!orderId || isNaN(orderId)) {
    return sendResponse(res, {
      status: 400,
      type: "error",
      message: "Invalid or missing orderId.",
    });
  }

  try {
    // const orderData = await prisma.order.findUnique({
    //   where: {
    //     id: parseInt(orderId),
    //   },
    //   include: {
    //     items: {
    //       include: {
    //         product: true,
    //       },
    //     },
    //   },
    // });

    const orderData = await orderModel.getOrderForCheckoutById(orderId);


    if (!orderData) {
      sendResponse(res, {
        status: 404,
        type: "error",
        message: "no order found..",
      });
    }

    console.log("orderData : ", orderData);

    sendResponse(res, {
      status: 200,
      type: "success",
      message: "order fetched successfully..",
      data: orderData || "null",
    });
  } catch (error) {
    console.error(error);
    sendResponse(res, {
      status: 500,
      type: error,
      message: "Error on getOrderForCheckout..",
    });
  }
};

module.exports = {
  createOrder,
  checkoutOrder,
  failedPayment,
  verifyPaymentAndUpdateOrder,
  getUserOrders,
  cancelOrder,
  getOrderByOrderId,
  createPaymentIntent,
  confirmPayment,
  paymentMethodId,
  getOrderForCheckout,
};
