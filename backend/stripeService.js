import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Créer un paiement (bloquer les fonds)
export const createPaymentIntent = async (reportId, amount) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // en centimes
    currency: "eur",
    metadata: { reportId },
  });
  return paymentIntent.client_secret;
};

// Capturer le paiement (libérer les fonds au solidaire)
export const capturePayment = async (paymentIntentId) => {
  const intent = await stripe.paymentIntents.capture(paymentIntentId);
  return intent;
};

// Rembourser le paiement (si le sinistré annule)
export const refundPayment = async (paymentIntentId) => {
  const refund = await stripe.refunds.create({ payment_intent: paymentIntentId });
  return refund;
};

