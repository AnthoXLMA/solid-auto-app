// stripeService.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/**
 * Créer un PaymentIntent classique (escrow)
 * @param {number} amount Montant en centimes
 */
export const createPaymentIntent = async (amount) => {
  if (!amount || amount <= 0) {
    throw new Error("Montant invalide pour le paiement");
  }

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "eur",
    capture_method: "manual", // ⚡ bloque l’argent sans capturer
  });
};

/**
 * Capturer un paiement (libérer au solidaire)
 * @param {string} paymentIntentId
 */
export const capturePaymentIntent = async (paymentIntentId) => {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.paymentIntents.capture(paymentIntentId);
};

/**
 * Rembourser un paiement
 * @param {string} paymentIntentId
 */
export const refundPaymentIntent = async (paymentIntentId) => {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.refunds.create({ payment_intent: paymentIntentId });
};

/**
 * 🔹 Crée un PaymentIntent pour un report avec commission plateforme
 * @param {number} amount Montant total payé par le sinistré (en centimes)
 * @param {string} currency Devise, ex: "eur"
 * @param {string} solidaireStripeId Compte Stripe Connect du solidaire
 * @param {number} commissionPourcentage Commission de la plateforme (ex: 20 pour 20%)
 */
export async function createPaymentIntentWithCommission(amount, currency = "eur", solidaireStripeId, commissionPourcentage) {
  if (!amount || amount <= 0) throw new Error("Montant invalide");
  if (!solidaireStripeId) throw new Error("Compte Stripe Connect du solidaire manquant");

  const applicationFeeAmount = Math.round((amount * commissionPourcentage) / 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency,
    payment_method_types: ["card"],
    capture_method: "manual", // blocage initial, capture manuelle
    transfer_data: {
      destination: solidaireStripeId, // fonds vont au solidaire
    },
    application_fee_amount: applicationFeeAmount, // commission plateforme
  });

  return paymentIntent;
}

/**
 * 🔹 Capture un PaymentIntent Stripe
 * @param {string} paymentIntentId
 */
export async function capturePayment(paymentIntentId) {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant pour capture");
  return await stripe.paymentIntents.capture(paymentIntentId);
}
