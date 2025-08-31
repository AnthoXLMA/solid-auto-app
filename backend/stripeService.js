// backend/stripeService.js
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/**
 * 🔹 Créer un séquestre (PaymentIntent bloqué)
 * @param {number} amount Montant en euros
 */
export async function createEscrow(amount) {
  if (!amount || amount <= 0) {
    throw new Error("Montant invalide pour le paiement");
  }

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Stripe attend des centimes
    currency: "eur",
    capture_method: "manual", // ⚡ bloque l’argent sans capturer
    payment_method_types: ["card"],
  });
}

/**
 * 🔹 Libérer le paiement (capture du séquestre)
 * @param {string} paymentIntentId
 */
export async function releasePayment(paymentIntentId) {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.paymentIntents.capture(paymentIntentId);
}

/**
 * 🔹 Rembourser le paiement au sinistré
 * @param {string} paymentIntentId
 */
export async function refundPayment(paymentIntentId) {
  if (!paymentIntentId) throw new Error("PaymentIntent ID manquant");
  return await stripe.refunds.create({ payment_intent: paymentIntentId });
}

/**
 * 🔹 Créer un séquestre avec commission plateforme et transfert direct au solidaire
 * @param {number} amount Montant total (en centimes)
 * @param {string} currency Devise (ex: "eur")
 * @param {string} solidaireStripeId Compte Stripe Connect du solidaire
 * @param {number} commissionPourcentage Pourcentage de commission pour la plateforme
 */
export async function createEscrowWithCommission(
  amount,
  currency = "eur",
  solidaireStripeId,
  commissionPourcentage
) {
  if (!amount || amount <= 0) throw new Error("Montant invalide");
  if (!solidaireStripeId) throw new Error("Compte Stripe Connect du solidaire manquant");

  const applicationFeeAmount = Math.round((amount * commissionPourcentage) / 100);

  return await stripe.paymentIntents.create({
    amount,
    currency,
    capture_method: "manual", // blocage initial
    payment_method_types: ["card"],
    transfer_data: {
      destination: solidaireStripeId, // fonds destinés au solidaire
    },
    application_fee_amount: applicationFeeAmount, // commission plateforme
  });
}
