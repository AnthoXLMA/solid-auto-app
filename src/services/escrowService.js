// src/services/escrowService.js

const API_URL = "http://localhost:4242"; // adapte si backend déployé

// Simule un escrow pour bloquer la somme (stock en mémoire ici)
const escrows = {}; // ⚠️ en prod → stocker en DB

/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 */
export const createEscrow = async (reportId, amount, setPaymentStatus) => {
  try {
    setPaymentStatus("pending");

    const res = await fetch(`${API_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount: amount * 100 }), // Stripe attend les montants en centimes
    });

    const data = await res.json();
    if (!data.clientSecret) throw new Error("Erreur lors de la création du paiement");

    escrows[reportId] = {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      status: "pending",
    };

    console.log("✅ Escrow créé pour report:", reportId);
    return data.clientSecret; // utilisé côté Stripe Checkout
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
export const releaseEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

    const res = await fetch(`${API_URL}/release-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    const data = await res.json();
    if (data.success) {
      escrow.status = "released";
      setPaymentStatus("released");
      console.log("💸 Paiement libéré pour report:", reportId);
    } else {
      throw new Error(data.error || "Erreur release-payment");
    }
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

/**
 * 3️⃣ Rembourser (si annulé)
 */
export const refundEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

    const res = await fetch(`${API_URL}/refund-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    const data = await res.json();
    if (data.success) {
      escrow.status = "refunded";
      setPaymentStatus("refunded");
      console.log("🔄 Paiement remboursé pour report:", reportId);
    } else {
      throw new Error(data.error || "Erreur refund-payment");
    }
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};
