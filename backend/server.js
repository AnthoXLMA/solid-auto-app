import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import admin from "firebase-admin";
import Stripe from "stripe";
import {
  createPaymentIntentWithCommission,
  capturePayment,
  refundPayment
} from "./stripeService.js";

// 🔑 Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

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
 * 0️⃣ Créer un compte Stripe Connect (onboarding) pour le solidaire
 */
app.post("/create-stripe-account", async (req, res) => {
  const { uid, email } = req.body;

  if (!uid || !email) {
    return res.status(400).json({ error: "uid et email requis" });
  }

  try {
    // Vérifier si le solidaire a déjà un compte Stripe
    const userRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "Utilisateur introuvable" });

    const userData = userDoc.data();
    if (userData.stripeAccountId) {
      return res.json({ url: null, message: "Compte Stripe déjà créé" });
    }

    // Créer un compte Connect de type Express
    const account = await stripe.accounts.create({
      type: "express",
      country: "FR",
      email,
    });

    // Créer le lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: "http://localhost:3000/payment",
      return_url: "http://localhost:3000/payment",
      type: "account_onboarding",
    });

    // Sauvegarder stripeAccountId dans Firestore pour le solidaire
    await userRef.update({ stripeAccountId: account.id });

    res.json({ url: accountLink.url });
  } catch (err) {
    console.error("❌ Erreur create-stripe-account :", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 1️⃣ Créer un paiement (escrow avec commission et transfert)
 */
app.post("/create-payment", async (req, res) => {
  const { reportId, amount, solidaireStripeId } = req.body;
  try {
    if (!solidaireStripeId) throw new Error("solidaireStripeId manquant");

    console.log(`➡️ Création PaymentIntent pour report ${reportId}, montant: ${amount}, solidaire: ${solidaireStripeId}`);

    const paymentIntent = await createPaymentIntentWithCommission(
      Math.round(amount * 100),
      "eur",
      solidaireStripeId || undefined, // ✅ ne force pas
      20
    );

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
