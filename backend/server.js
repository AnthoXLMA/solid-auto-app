// server.js
import 'dotenv/config'; // ou import dotenv from 'dotenv'; dotenv.config();
import express from "express";
import cors from "cors";
import { createPaymentIntent, capturePaymentIntent, refundPaymentIntent } from "./stripeService.js";

const app = express();
app.use(cors());
app.use(express.json());

// Middleware pour logger toutes les requêtes
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`, req.body);
  next();
});

/**
 * 1️⃣ Créer un paiement (escrow)
 */
app.post("/create-payment", async (req, res) => {
  const { amount } = req.body;
  try {
    console.log(`➡️ Création PaymentIntent pour montant: ${amount}`);
    const paymentIntent = await createPaymentIntent(amount);
    console.log("✅ PaymentIntent créé :", paymentIntent.id, "statut:", paymentIntent.status);

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
  const { paymentIntentId } = req.body;
  try {
    console.log(`➡️ Capture PaymentIntent ${paymentIntentId}`);
    const paymentIntent = await capturePaymentIntent(paymentIntentId);
    console.log("✅ Paiement capturé :", paymentIntent.id, "statut:", paymentIntent.status);

    res.json({ success: true, paymentIntent });
  } catch (err) {
    console.error("❌ Erreur release-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 3️⃣ Rembourser (refund)
 */
app.post("/refund-payment", async (req, res) => {
  const { paymentIntentId } = req.body;
  try {
    console.log(`➡️ Refund PaymentIntent ${paymentIntentId}`);
    const refund = await refundPaymentIntent(paymentIntentId);
    console.log("✅ Paiement remboursé :", refund.id);

    res.json({ success: true, refund });
  } catch (err) {
    console.error("❌ Erreur refund-payment :", err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4242;
app.listen(PORT, () => console.log(`Stripe server running on port ${PORT}`));
