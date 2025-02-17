const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const Razorpay = require("razorpay");
const razorpay = require("../utils/razorpay");

const createCustomer = async (userId) => {
  return await stripe.customers.create({
    metadata: { userId: userId || "guest" },
  });
};

const createEphemeralKey = async (customerId) => {
  return await stripe.ephemeralKeys.create(
    { customer: customerId },
    { apiVersion: "2024-12-18.acacia" }
  );
};

const createPaymentIntent = async (totalAmount, currency, customerId) => {
  return await stripe.paymentIntents.create({
    amount: totalAmount * 100,
    currency,
    customer: customerId,
    description: "ShopFlow Order Payment",
    metadata: { userId: customerId || "guest" },
    automatic_payment_methods: { enabled: true },
  });
};

const retrievePaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

const razorpayOrder = async (totalAmount) => {
  return await razorpay.orders.create({
    amount: Math.ceil(totalAmount * 100),
    currency: "USD",
    receipt: `order_rcpt_${Date.now()}`,
  });
};

const isValidSignature = async (razorpayId, paymentId, paymentSignature, razorpaySecret) => {
   return Razorpay.validateWebhookSignature(
    razorpayId + "|" + paymentId,
    paymentSignature,
    razorpaySecret
  );
};

module.exports = {
  createCustomer,
  createEphemeralKey,
  createPaymentIntent,
  retrievePaymentIntent,
  razorpayOrder,
  isValidSignature
};
