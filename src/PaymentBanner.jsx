import React, { useState } from "react";
import { createEscrow, releaseEscrow, refundEscrow } from "./services/escrowService";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Clé publique Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

function StripeCheckout({ report, setPaymentStatus }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");

  const handlePay = async () => {
    setPaymentStatus("pending");

    try {
      // 1️⃣ Créer un paiement côté backend (API /create-payment)
      const res = await fetch("http://localhost:4242/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: report.frais * 100 }), // Stripe en centimes
      });
      const data = await res.json();
      const clientSecret = data.clientSecret;

      // 2️⃣ Confirmer le paiement
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setStatus("Erreur : " + result.error.message);
        setPaymentStatus(null);
      } else if (result.paymentIntent.status === "succeeded") {
        setStatus("✅ Paiement effectué !");
        setPaymentStatus("released"); // on utilise ton état existant
      }
    } catch (err) {
      setStatus("Erreur : " + err.message);
      setPaymentStatus(null);
    }
  };

  return (
    <div style={{ marginTop: 10 }}>
      <CardElement />
      <button onClick={handlePay} disabled={!stripe} style={{ marginTop: 10 }}>
        Bloquer le paiement avec Stripe
      </button>
      <p>{status}</p>
    </div>
  );
}

export default function PaymentBanner({ report, solidaire }) {
  const [paymentStatus, setPaymentStatus] = useState(null);

  if (!report || !solidaire) return null;

  return (
    <div style={{
      position: "absolute",
      top: 10,
      left: "50%",
      transform: "translateX(-50%)",
      background: "#e6f7ff",
      border: "1px solid #91d5ff",
      padding: "10px 20px",
      borderRadius: "12px",
      zIndex: 1000,
      textAlign: "center"
    }}>
      <p>🚗 {solidaire.name} est en route pour vous aider</p>
      <p>💰 Frais : {report.frais} €</p>

      {/* Blocage classique via escrow */}
      {paymentStatus === null && (
        <button
          onClick={() => createEscrow(report.id, report.frais, setPaymentStatus)}
          style={{ marginTop: 10, padding: "6px 12px" }}
        >
          Bloquer le paiement (Escrow)
        </button>
      )}

      {/* Stripe Checkout */}
      {paymentStatus === "pending" && (
        <Elements stripe={stripePromise}>
          <StripeCheckout report={report} setPaymentStatus={setPaymentStatus} />
        </Elements>
      )}

      {paymentStatus === "released" && <p>✅ Paiement effectué !</p>}
      {paymentStatus === "refunded" && <p>⚠️ Paiement remboursé !</p>}

      {/* Simulation pour test */}
      {paymentStatus === "pending" && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => releaseEscrow(report.id, setPaymentStatus)} style={{ marginRight: 10 }}>
            Simuler intervention terminée
          </button>
          <button onClick={() => refundEscrow(report.id, setPaymentStatus)}>
            Simuler annulation
          </button>
        </div>
      )}
    </div>
  );
}
