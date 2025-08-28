// src/services/escrowService.js
const API_URL = "http://localhost:4242";

// Stock temporaire des escrows (en mémoire)
const escrows = {}; // En prod → stocker en DB

/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 */
export const createEscrow = async (reportId, amount, setPaymentStatus) => {
  try {
    if (!setPaymentStatus) setPaymentStatus = () => {};

    if (amount <= 0) {
      escrows[reportId] = { status: "released" };
      setPaymentStatus("released");
      console.log("💰 Escrow 0 € créé pour report:", reportId);
      return { success: true, status: "released" };
    }

    setPaymentStatus("initiated");

    const res = await fetch(`${API_URL}/create-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, amount: Math.round(amount * 100) }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    if (!data.clientSecret || !data.paymentIntentId) throw new Error("Erreur création PaymentIntent");

    escrows[reportId] = {
      clientSecret: data.clientSecret,
      paymentIntentId: data.paymentIntentId,
      status: "initiated",
    };

    console.log("✅ Escrow créé pour report:", reportId, data);
    return { success: true, clientSecret: data.clientSecret, status: "initiated" };
  } catch (err) {
    console.error("❌ createEscrow:", err.message);
    setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};

/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 * Supporte reportId ou paymentIntentId
 */
export const releaseEscrow = async (reportOrPaymentIntentId, setPaymentStatus) => {
  try {
    if (typeof setPaymentStatus !== "function") setPaymentStatus = () => {};

    let escrow;
    let reportId;

    if (reportOrPaymentIntentId.startsWith("pi_")) {
      // PaymentIntentId fourni
      const found = Object.entries(escrows).find(
        ([_, e]) => e.paymentIntentId === reportOrPaymentIntentId
      );
      if (!found) throw new Error("Escrow introuvable pour ce PaymentIntentId");
      [reportId, escrow] = found;
    } else {
      // reportId fourni
      reportId = reportOrPaymentIntentId;
      escrow = escrows[reportId];
      if (!escrow) throw new Error("Escrow introuvable pour ce reportId");
    }

    if (escrow.status === "released") {
      console.log("💸 Paiement déjà libéré pour report:", reportId);
      return { success: true, status: "released" };
    }

    setPaymentStatus("releasing");

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
 * Supporte reportId ou paymentIntentId
 */
export const refundEscrow = async (reportOrPaymentIntentId, setPaymentStatus) => {
  try {
    if (typeof setPaymentStatus !== "function") setPaymentStatus = () => {};

    // Identifier l'escrow
    let escrow;
    let reportId;

    if (reportOrPaymentIntentId.startsWith("pi_")) {
      escrow = Object.entries(escrows).find(
        ([_, e]) => e.paymentIntentId === reportOrPaymentIntentId
      );
      if (!escrow) throw new Error("Escrow introuvable pour ce PaymentIntentId");
      [reportId, escrow] = escrow;
    } else {
      reportId = reportOrPaymentIntentId;
      escrow = escrows[reportId];
      if (!escrow) throw new Error("Escrow introuvable pour ce reportId");
    }

    if (escrow.status === "refunded") {
      console.log("🔄 Paiement déjà remboursé pour report:", reportId);
      return { success: true, status: "refunded" };
    }

    const res = await fetch(`${API_URL}/refund-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    console.log("Response refund-payment:", data);

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

