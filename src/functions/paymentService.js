import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // mettre ta clé secrète

// Créer un paiement bloqué (PaymentIntent avec capture différée)
export async function createEscrow(reportId, amount, customerEmail) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // en centimes
    currency: "eur",
    payment_method_types: ["card"],
    capture_method: "manual", // paiement autorisé mais pas encore capturé
    description: `Frais dépannage report ${reportId}`,
    receipt_email: customerEmail,
  });

  return paymentIntent.client_secret;
}

// Libérer le paiement après intervention
export async function releaseEscrow(paymentIntentId) {
  return await stripe.paymentIntents.capture(paymentIntentId);
}

// Rembourser si intervention annulée
export async function refundEscrow(paymentIntentId) {
  return await stripe.refunds.create({ payment_intent: paymentIntentId });
}
