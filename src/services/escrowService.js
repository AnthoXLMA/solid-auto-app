// src/services/escrowService.js

const API_URL = "http://localhost:4242";

// Stock temporaire des escrows (en mémoire)
const escrows = {}; // En prod → stocker en DB

/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 */
export const createEscrow = async (reportId, amount, setPaymentStatus) => {
  try {
    if (amount <= 0) {
      // Montant 0 → pas de Stripe, juste marquer comme séquestre créé
      escrows[reportId] = { status: "created" };
      setPaymentStatus("released"); // on considère déjà libéré
      console.log("💰 Escrow 0 € créé pour report:", reportId);
      return { success: true, status: "created" };
    }

    setPaymentStatus("pending");

    const res = await fetch(`${API_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount: Math.round(amount * 100) }), // Stripe attend les centimes
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    if (!data.clientSecret) throw new Error("Erreur lors de la création du paiement");

    escrows[reportId] = {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      status: "pending",
    };

    console.log("✅ Escrow créé pour report:", reportId);
    return { success: true, clientSecret: data.clientSecret, status: "pending" };
  } catch (err) {
    console.error("❌ createEscrow:", err.message);
    setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};

/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
export const releaseEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

    if (escrow.status === "created") {
      setPaymentStatus("released");
      console.log("💸 Paiement 0 € libéré pour report:", reportId);
      return { success: true, status: "released" };
    }

    const res = await fetch(`${API_URL}/release-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    if (data.success) {
      escrow.status = "released";
      setPaymentStatus("released");
      console.log("💸 Paiement libéré pour report:", reportId);
      return { success: true, status: "released" };
    } else {
      throw new Error(data.error || "Erreur release-payment");
    }
  } catch (err) {
    console.error("❌ releaseEscrow:", err.message);
    setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};

/**
 * 3️⃣ Rembourser (si annulé)
 */
export const refundEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

    if (escrow.status === "created") {
      // Montant 0 → pas de remboursement Stripe nécessaire
      escrow.status = "refunded";
      setPaymentStatus("refunded");
      console.log("🔄 Paiement 0 € remboursé pour report:", reportId);
      return { success: true, status: "refunded" };
    }

    const res = await fetch(`${API_URL}/refund-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    if (data.success) {
      escrow.status = "refunded";
      setPaymentStatus("refunded");
      console.log("🔄 Paiement remboursé pour report:", reportId);
      return { success: true, status: "refunded" };
    } else {
      throw new Error(data.error || "Erreur refund-payment");
    }
  } catch (err) {
    console.error("❌ refundEscrow:", err.message);
    setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};
