const paymentModel = require("../models/paymentModel");

const processPaymentIntent = async (userId, totalAmount, currency) => {
  const customer = await paymentModel.createCustomer(userId);
  const ephemeralKey = await paymentModel.createEphemeralKey(customer.id);
  const paymentIntent = await paymentModel.createPaymentIntent(
    totalAmount,
    currency,
    customer.id
  );

  return {
    paymentIntent: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    ephemeralKey: ephemeralKey.secret,
    customer: customer.id,
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    status: paymentIntent.status,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  };
};

const getPaymentMethodId = async (paymentIntentId) => {
  const paymentIntent = await paymentModel.retrievePaymentIntent(
    paymentIntentId
  );
  return paymentIntent.payment_method;
};



module.exports = { processPaymentIntent, getPaymentMethodId };
