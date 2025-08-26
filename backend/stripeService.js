// stripeService.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/**
 * Créer un PaymentIntent en mode "manual" (escrow)
 */
export const createPaymentIntent = async (amount) => {
  return await stripe.paymentIntents.create({
    amount,
    currency: "eur",
    capture_method: "manual", // ⚠️ très important pour l’escrow
  });
};

/**
 * Capturer un paiement (libérer au solidaire)
 */
export const capturePaymentIntent = async (paymentIntentId) => {
  return await stripe.paymentIntents.capture(paymentIntentId);
};

/**
 * Rembourser un paiement
 */
export const refundPaymentIntent = async (paymentIntentId) => {
  return await stripe.refunds.create({ payment_intent: paymentIntentId });
};
