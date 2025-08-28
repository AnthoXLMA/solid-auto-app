import React, { useState } from "react";
import { createEscrow, releaseEscrow, refundEscrow } from "./services/escrowService";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

// Clé publique Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
  console.error("❌ Clé publique Stripe manquante dans .env !");
}

// Formulaire Stripe pour confirmer le paiement
function StripeCheckout({ clientSecret, onPaymentSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) return;

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setStatus("Erreur : " + result.error.message);
        onPaymentSuccess(null);
      } else {
        // 🔹 Nouveau : afficher le PaymentIntent complet pour debug
        console.log("PaymentIntent reçu :", result.paymentIntent);
        console.log("Status PaymentIntent :", result.paymentIntent.status);

        if (result.paymentIntent.status === "requires_capture") {
          setStatus("✅ Paiement bloqué en séquestre !");
          onPaymentSuccess("pending"); // paiement bloqué
        } else if (result.paymentIntent.status === "succeeded") {
          setStatus("✅ Paiement capturé immédiatement !");
          onPaymentSuccess("released"); // paiement déjà libéré
        } else {
          setStatus("⚠️ Paiement non bloqué. Vérifie la carte.");
          onPaymentSuccess(null);
        }
      }
    } catch (err) {
      setStatus("Erreur : " + err.message);
      onPaymentSuccess(null);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <CardElement />
      <button onClick={handlePay} disabled={!stripe} style={{ marginTop: 10 }}>
        Confirmer le paiement
      </button>
      <p>{status}</p>
    </div>
  );
}


export default function PaymentBanner({ report, solidaire }) {
  const [paymentStatus, setPaymentStatus] = useState(null); // null | initiated | pending | released | refunded
  const [clientSecret, setClientSecret] = useState(null);

  if (!report || !solidaire) return null;

  // 1️⃣ Création de l'escrow
  const handleCreateEscrow = async () => {
    const result = await createEscrow(report.id, report.frais, setPaymentStatus);
    if (result.success && result.clientSecret) {
      setClientSecret(result.clientSecret);
      setPaymentStatus("initiated"); // paiement initié, pas encore bloqué
    }
  };

  // 2️⃣ Libérer le paiement
  const handleReleaseEscrow = async () => {
    const result = await releaseEscrow(report.id, setPaymentStatus);
    if (result.success) {
      setPaymentStatus("released");
    }
  };

  // 3️⃣ Rembourser le paiement
  const handleRefundEscrow = async () => {
    const result = await refundEscrow(report.id, setPaymentStatus);
    if (result.success) {
      setPaymentStatus("refunded");
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#e6f7ff",
        border: "1px solid #91d5ff",
        padding: "10px 20px",
        borderRadius: "12px",
        zIndex: 1000,
        textAlign: "center",
      }}
    >
      <p>🚗 {solidaire.name} est en route pour vous aider</p>
      <p>💰 Frais : {report.frais} €</p>

      {/* Bouton pour bloquer le paiement */}
      {paymentStatus === null && (
        <button onClick={handleCreateEscrow} style={{ marginTop: 10, padding: "6px 12px" }}>
          Bloquer le paiement (Escrow)
        </button>
      )}

      {/* Formulaire Stripe si paiement initié */}
      {clientSecret && paymentStatus === "initiated" && (
        <Elements stripe={stripePromise}>
          <StripeCheckout clientSecret={clientSecret} onPaymentSuccess={setPaymentStatus} />
        </Elements>
      )}

      {/* Actions disponibles uniquement après paiement bloqué */}
      {paymentStatus === "pending" && (
        <div style={{ marginTop: 10 }}>
          <p>✅ Paiement bloqué, le solidaire peut maintenant intervenir !</p>
          <button onClick={handleReleaseEscrow} style={{ marginRight: 10 }}>
            Simuler intervention terminée
          </button>
          <button onClick={handleRefundEscrow}>Simuler annulation</button>
        </div>
      )}

      {/* États finaux */}
      {paymentStatus === "released" && <p>✅ Paiement libéré au solidaire !</p>}
      {paymentStatus === "refunded" && <p>⚠️ Paiement remboursé.</p>}
    </div>
  );
}
