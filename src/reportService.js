// src/reportService.js
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

// Création d’un nouveau report
export async function createReport({ latitude, longitude, nature, message, address, user }) {
  try {
    const reportRef = await addDoc(collection(db, "reports"), {
      latitude,
      longitude,
      nature,
      message,
      address,
      status: "en-attente",
      ownerUid: user.uid,
      ownerName: user.displayName || "Sinistré",
      timestamp: serverTimestamp(),
      helperConfirmed: false,
      frais: 0,
      paymentIntentId: null,
      escrowStatus: null,
    });
    return { success: true, id: reportRef.id };
  } catch (err) {
    console.error("Erreur création report:", err);
    return { success: false, error: err.message };
  }
}

// Mise à jour du report après AcceptModal
export async function confirmReport(report, montant, currentUserUid) {
  try {
    const reportRef = doc(db, "reports", report.id);
    await updateDoc(reportRef, {
      frais: montant,
      helperConfirmed: true,
      helperUid: currentUserUid,
      status: "attente séquestre",
      timestamp: serverTimestamp(),
    });
    return { success: true };
  } catch (err) {
    console.error("Erreur confirmReport:", err);
    return { success: false, error: err.message };
  }
}
