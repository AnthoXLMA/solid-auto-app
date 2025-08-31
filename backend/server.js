// backend/server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import {
  createPaymentIntentWithCommission,
  capturePayment,  // aliasé correctement
  refundPayment    // aliasé correctement
} from "./stripeService.js";

// 🔑 Charger la clé Firebase
const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("./backend/serviceAccountKey.json"), "utf-8")
);

// 🔑 Initialiser Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const app = express();
app.use(cors());
app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`, req.body);
  next();
});

/**
 * 1️⃣ Créer un paiement (escrow avec commission et transfert)
 */
app.post("/create-payment", async (req, res) => {
  const { reportId, amount, solidaireStripeId } = req.body;
  try {
    if (!solidaireStripeId) throw new Error("solidaireStripeId manquant");

    console.log(
      `➡️ Création PaymentIntent pour report ${reportId}, montant: ${amount}, solidaire: ${solidaireStripeId}`
    );

    // ⚡ création du PaymentIntent avec commission (20% ici)
    const paymentIntent = await createPaymentIntentWithCommission(
      Math.round(amount * 100), // montant en centimes
      "eur",
      solidaireStripeId,
      20
    );

    // Sauvegarde en Firestore
    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "created",
      status: "séquestre confirmé",
      paymentIntentId: paymentIntent.id,
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err) {
    console.error("❌ Erreur create-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2️⃣ Libérer le paiement (capture)
 */
app.post("/release-payment", async (req, res) => {
  const { reportId, paymentIntentId } = req.body;
  try {
    console.log(`➡️ Capture PaymentIntent ${paymentIntentId}`);
    const paymentIntent = await capturePayment(paymentIntentId);

    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "released",
      status: "terminé",
    });

    res.json({ success: true, paymentIntent });
  } catch (err) {
    console.error("❌ Erreur release-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3️⃣ Rembourser un paiement (refund)
 */
app.post("/refund-payment", async (req, res) => {
  const { reportId, paymentIntentId } = req.body;
  try {
    console.log(`➡️ Refund PaymentIntent ${paymentIntentId}`);
    const refund = await refundPayment(paymentIntentId);

    await admin.firestore().collection("reports").doc(reportId).update({
      escrowStatus: "refunded",
      status: "remboursé",
    });

    res.json({ success: true, refund });
  } catch (err) {
    console.error("❌ Erreur refund-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));
