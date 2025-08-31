import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

/**
 * 🔹 Créer un séquestre (PaymentIntent bloqué)
 * @param {number} amount Montant en euros
 */
export async function createPaymentIntent(amount) {
  if (!amount || amount <= 0) throw new Error("Montant invalide pour le paiement");

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: "eur",
    capture_method: "manual",
    payment_method_types: ["card"],
  });
}

/**
 * 🔹 Libérer le paiement (capture du séquestre)
 * @param {string} paymentIntentId
 */
export async function capturePayment(paymentIntentId) {
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
 * 🔹 Créer un séquestre avec commission plateforme (optionnel) et transfert au solidaire si dispo
 * @param {number} amount Montant total (en centimes)
 * @param {string} currency Devise (ex: "eur")
 * @param {string|null} solidaireStripeId Compte Stripe Connect du solidaire (peut être null)
 * @param {number} commissionPourcentage Pourcentage de commission pour la plateforme
 */
export async function createPaymentIntentWithCommission(
  amount,
  currency = "eur",
  solidaireStripeId = null,
  commissionPourcentage = 0
) {
  if (!amount || amount <= 0) throw new Error("Montant invalide");

  // Commission calculée seulement si nécessaire
  const applicationFeeAmount =
    commissionPourcentage > 0 ? Math.round((amount * commissionPourcentage) / 100) : 0;

  // Cas 1 : solidaire a un compte Stripe -> transfert direct
  if (solidaireStripeId) {
    return await stripe.paymentIntents.create({
      amount,
      currency,
      capture_method: "manual",
      payment_method_types: ["card"],
      transfer_data: { destination: solidaireStripeId },
      application_fee_amount: applicationFeeAmount,
    });
  }

  // Cas 2 : pas de compte Stripe -> fonds bloqués sur le compte plateforme
  return await stripe.paymentIntents.create({
    amount,
    currency,
    capture_method: "manual",
    payment_method_types: ["card"],
  });
}
