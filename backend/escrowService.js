// src/services/escrowService.js
import { recalcUserScore } from "../utils/userScoreService";
import { createPaymentIntentWithCommission, capturePayment, refundPaymentIntent } from "./stripeService";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";

const API_URL = "http://localhost:4242";

// Stock temporaire des escrows (en mémoire)
const escrows = {}; // En prod → stocker en DB

/**
 * 1️⃣ Créer un séquestre (paiement en attente)
 * Supporte Stripe Connect avec commission 20%
 */
export const createEscrow = async (reportId, amount, solidaireStripeId, setPaymentStatus) => {
  try {
    if (!setPaymentStatus) setPaymentStatus = () => {};

    if (amount <= 0) {
      escrows[reportId] = { status: "released" };
      setPaymentStatus("released");
      console.log("💰 Escrow 0 € créé pour report:", reportId);
      return { success: true, status: "released" };
    }

    setPaymentStatus("initiated");

    // 🔹 Crée PaymentIntent avec commission 20%
    const paymentIntent = await createPaymentIntentWithCommission(
      Math.round(amount * 100), // en centimes
      "eur",
      solidaireStripeId,
      20 // 20% commission
    );

    // Sauvegarde temporaire (en mémoire) ou en Firestore
    escrows[reportId] = {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      status: "initiated",
      solidaireStripeId,
    };

    // Optionnel : sauvegarder dans Firestore pour suivi
    const reportRef = doc(db, "reports", reportId);
    await updateDoc(reportRef, {
      escrowClientSecret: paymentIntent.client_secret,
      escrowPaymentIntentId: paymentIntent.id,
      escrowStatus: "initiated",
    });

    console.log("✅ Escrow créé pour report:", reportId, paymentIntent.id);
    return { success: true, clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
  } catch (err) {
    console.error("❌ createEscrow:", err.message);
    if (setPaymentStatus) setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};

/**
 * 2️⃣ Libérer le paiement (capturer le séquestre)
 */
export const releaseEscrow = async (reportOrPaymentIntentId, solidaireUid, setPaymentStatus) => {
  try {
    if (typeof setPaymentStatus !== "function") setPaymentStatus = () => {};

    let escrow;
    let reportId;

    if (reportOrPaymentIntentId.startsWith("pi_")) {
      const found = Object.entries(escrows).find(([_, e]) => e.paymentIntentId === reportOrPaymentIntentId);
      if (!found) throw new Error("Escrow introuvable pour ce PaymentIntentId");
      [reportId, escrow] = found;
    } else {
      reportId = reportOrPaymentIntentId;
      escrow = escrows[reportId];
      if (!escrow) throw new Error("Escrow introuvable pour ce reportId");
    }

    if (escrow.status === "released") {
      console.log("💸 Paiement déjà libéré pour report:", reportId);
      return { success: true, status: "released" };
    }

    setPaymentStatus("releasing");

    // 🔹 Capture du paiement Stripe
    const paymentIntent = await capturePayment(escrow.paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      escrow.status = "released";
      setPaymentStatus("released");

      // 🔹 Recalcule du score utilisateur
      if (solidaireUid) await recalcUserScore(solidaireUid);

      console.log("💸 Paiement libéré pour report:", reportId);
      return { success: true, status: "released" };
    } else {
      throw new Error("Erreur lors de la libération du paiement");
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
export const refundEscrow = async (reportOrPaymentIntentId, solidaireUid, setPaymentStatus) => {
  try {
    if (typeof setPaymentStatus !== "function") setPaymentStatus = () => {};

    let escrow;
    let reportId;

    if (reportOrPaymentIntentId.startsWith("pi_")) {
      const found = Object.entries(escrows).find(([_, e]) => e.paymentIntentId === reportOrPaymentIntentId);
      if (!found) throw new Error("Escrow introuvable pour ce PaymentIntentId");
      [reportId, escrow] = found;
    } else {
      reportId = reportOrPaymentIntentId;
      escrow = escrows[reportId];
      if (!escrow) throw new Error("Escrow introuvable pour ce reportId");
    }

    if (escrow.status === "refunded") {
      console.log("🔄 Paiement déjà remboursé pour report:", reportId);
      return { success: true, status: "refunded" };
    }

    // 🔹 Remboursement via Stripe
    const refundResult = await refundPaymentIntent(escrow.paymentIntentId);

    if (refundResult.status === "succeeded" || refundResult.status === "requires_capture") {
      escrow.status = "refunded";
      setPaymentStatus("refunded");

      // 🔹 Recalcule du score utilisateur
      if (solidaireUid) await recalcUserScore(solidaireUid);

      console.log("🔄 Paiement remboursé pour report:", reportId);
      return { success: true, status: "refunded" };
    } else {
      throw new Error("Erreur lors du remboursement");
    }
  } catch (err) {
    console.error("❌ refundEscrow:", err.message);
    setPaymentStatus("error");
    return { success: false, error: err.message };
  }
};
