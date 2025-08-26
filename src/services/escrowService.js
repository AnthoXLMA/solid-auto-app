import { createPaymentIntent, capturePayment, refundPayment } from "./stripeService";

// Simule un escrow pour bloquer la somme
const escrows = {}; // en production, stocker côté backend/Firebase

export const createEscrow = async (reportId, amount, setPaymentStatus) => {
  try {
    setPaymentStatus("pending");
    const clientSecret = await createPaymentIntent(reportId, amount);
    escrows[reportId] = { clientSecret, status: "pending" };
    console.log("Escrow créé pour report:", reportId);
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

export const releaseEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");
    await capturePayment(escrow.clientSecret);
    escrow.status = "released";
    setPaymentStatus("released");
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};

export const refundEscrow = async (reportId, setPaymentStatus) => {
  try {
    const escrow = escrows[reportId];
    if (!escrow) throw new Error("Escrow introuvable");
    await refundPayment(escrow.clientSecret);
    escrow.status = "refunded";
    setPaymentStatus("refunded");
  } catch (err) {
    console.error(err);
    setPaymentStatus("error");
  }
};
