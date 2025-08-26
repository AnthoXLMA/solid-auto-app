// Appelle ton backend pour créer un PaymentIntent Stripe
export const createPaymentIntent = async (reportId, amount) => {
  try {
    const response = await fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount }),
    });
    const data = await response.json();
    return data.clientSecret; // client_secret pour Stripe.js
  } catch (err) {
    console.error("Erreur Stripe:", err);
    throw err;
  }
};

// Capture le paiement côté backend (lorsque solidaire a terminé)
export const capturePayment = async (paymentIntentId) => {
  try {
    const response = await fetch("/api/capture-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    return await response.json();
  } catch (err) {
    console.error("Erreur capture Stripe:", err);
    throw err;
  }
};

// Rembourse le paiement (si annulation)
export const refundPayment = async (paymentIntentId) => {
  try {
    const response = await fetch("/api/refund-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId }),
    });
    return await response.json();
  } catch (err) {
    console.error("Erreur remboursement Stripe:", err);
    throw err;
  }
};
