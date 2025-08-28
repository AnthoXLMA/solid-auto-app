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
export const releaseEscrow = async (reportId, setPaymentStatus) => {
  try {
    // si pas de fonction passée → noop
    if (typeof setPaymentStatus !== "function") {
      setPaymentStatus = () => {};
    }

    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

    if (escrow.status === "released") {
      console.log("💸 Paiement déjà libéré pour report:", reportId);
      return { success: true, status: "released" };
    }

    const res = await fetch(`${API_URL}/release-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentIntentId: escrow.paymentIntentId }),
    });

    if (!res.ok) throw new Error(`Erreur HTTP ${res.status}`);

    const data = await res.json();
    console.log("Response release-payment:", data);

    if (data.success) {
      escrow.status = "released";

      if (typeof setPaymentStatus === "function") {
        setPaymentStatus("released");
      }

      console.log("💸 Paiement libéré pour report:", reportId);
      return { success: true, status: "released" };
    } else {
      throw new Error(data.error || "Erreur release-payment");
    }
  } catch (err) {
    console.error("❌ releaseEscrow:", err.message);

    if (typeof setPaymentStatus === "function") {
      setPaymentStatus("error");
    }

    return { success: false, error: err.message };
  }
};

/**
 * 3️⃣ Rembourser (si annulé)
 */
export const refundEscrow = async (reportId, setPaymentStatus) => {
  try {
    if (!setPaymentStatus) setPaymentStatus = () => {};

    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");

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
