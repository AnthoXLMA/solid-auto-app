import React, { useState } from "react";
import { createEscrow, releaseEscrow, refundEscrow } from "./services/escrowService";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";


// Clé publique Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

if (!process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY) {
  console.error("❌ Clé publique Stripe manquante dans .env !");
}

// --- StripeCheckout Component ---
// function StripeCheckout({ clientSecret, onPaymentSuccess }) {
//   const stripe = useStripe();
//   const elements = useElements();
//   const [status, setStatus] = useState("");
//   const [loading, setLoading] = useState(false);

  // const handlePay = async () => {
  //   if (!stripe || !elements) return;
  //   setLoading(true);
  //   try {
  //     const result = await stripe.confirmCardPayment(clientSecret, {
  //       payment_method: { card: elements.getElement(CardElement) },
  //     });

  //     if (result.error) {
  //       setStatus(`❌ ${result.error.message}`);
  //       onPaymentSuccess(null);
  //     } else {
  //       console.log("PaymentIntent reçu :", result.paymentIntent);

  //       if (result.paymentIntent.status === "requires_capture") {
  //         setStatus("✅ Paiement bloqué en séquestre !");
  //         onPaymentSuccess("pending");
  //       } else if (result.paymentIntent.status === "succeeded") {
  //         setStatus("✅ Paiement capturé immédiatement !");
  //         onPaymentSuccess("released");
  //       } else {
  //         setStatus("⚠️ Paiement non bloqué. Vérifie la carte.");
  //         onPaymentSuccess(null);
  //       }
  //     }
  //   } catch (err) {
  //     setStatus("❌ Erreur : " + err.message);
  //     onPaymentSuccess(null);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

function StripeCheckout({ clientSecret, onPaymentSuccess, report }) {
  const stripe = useStripe();
  const elements = useElements();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: elements.getElement(CardElement) },
      });

      if (result.error) {
        setStatus(`❌ ${result.error.message}`);
        onPaymentSuccess(null);
      } else if (result.paymentIntent) {
        const pi = result.paymentIntent;

        if (pi.status === "requires_capture") {
          setStatus("✅ Paiement bloqué en séquestre !");
          onPaymentSuccess("pending");

          // 🔑 Mise à jour Firestore
          const reportRef = doc(db, "reports", report.id);
          await updateDoc(reportRef, { escrowStatus: "created" });

          toast.success("💰 Montant séquestré ! Le solidaire peut maintenant intervenir.");
        } else if (pi.status === "succeeded") {
          setStatus("✅ Paiement capturé immédiatement !");
          onPaymentSuccess("released");
        } else {
          setStatus("⚠️ Paiement non bloqué. Vérifie la carte.");
          onPaymentSuccess(null);
        }
      }
    } catch (err) {
      setStatus("❌ Erreur : " + err.message);
      onPaymentSuccess(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="p-3 border rounded-lg bg-white">
        <CardElement />
      </div>
      <button
        onClick={handlePay}
        disabled={!stripe || loading}
        className={`w-full py-2 rounded-lg text-white font-semibold transition ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {loading ? "⏳ Confirmer..." : "Confirmer le paiement"}
      </button>
      {status && (
        <div
          className={`mt-2 p-2 rounded text-sm ${
            status.includes("❌")
              ? "bg-red-50 text-red-600 border border-red-200"
              : "bg-green-50 text-green-600 border border-green-200"
          }`}
        >
          {status}
        </div>
      )}
    </div>
  );
}

// --- PaymentBanner Component ---
export default function PaymentBanner({ report, solidaire }) {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  if (!report || !solidaire) return null;

  const handleCreateEscrow = async () => {
    const result = await createEscrow(report.id, report.frais, setPaymentStatus);
    if (result.success && result.clientSecret) {
      setClientSecret(result.clientSecret);
      setPaymentStatus("initiated");
    }
  };

  const handleReleaseEscrow = async () => {
    const result = await releaseEscrow(report.id, setPaymentStatus);
    if (result.success) setPaymentStatus("released");
  };

  const handleRefundEscrow = async () => {
    const result = await refundEscrow(report.id, setPaymentStatus);
    if (result.success) setPaymentStatus("refunded");
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[400px] bg-white border border-gray-200 shadow-lg rounded-2xl p-5 z-[9999] pointer-events-auto">
  <h2 className="text-center text-lg font-semibold mb-2">
    🚗 {solidaire.name} est en route !
  </h2>
  <p className="text-center text-gray-700 mb-4">
    💰 Frais : <span className="font-bold">{report.frais} €</span>
  </p>

  {paymentStatus === null && (
    <button
      onClick={handleCreateEscrow}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
    >
      Bloquer le paiement (Escrow)
    </button>
  )}

  {clientSecret && paymentStatus === "initiated" && (
    <Elements stripe={stripePromise}>
      <StripeCheckout
        clientSecret={clientSecret}
        onPaymentSuccess={setPaymentStatus}
        report={report}   // ✅ on passe bien report ici
      />
    </Elements>
  )}

  {paymentStatus === "pending" && (
    <div className="space-y-2 text-center mt-4">
      <div className="bg-green-50 border border-green-200 text-green-600 p-2 rounded text-sm">
        ✅ Paiement bloqué, le solidaire peut intervenir !
      </div>
      <div className="flex gap-2 justify-center mt-2">
        <button
          onClick={handleReleaseEscrow}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition"
        >
          Terminer intervention
        </button>
        <button
          onClick={handleRefundEscrow}
          className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition"
        >
          Annuler
        </button>
      </div>
    </div>
  )}

  {paymentStatus === "released" && (
    <div className="bg-green-50 border border-green-200 text-green-600 p-2 rounded text-center mt-4">
      ✅ Paiement libéré au solidaire !
    </div>
  )}

  {paymentStatus === "refunded" && (
    <div className="bg-red-50 border border-red-200 text-red-600 p-2 rounded text-center mt-4">
      ⚠️ Paiement remboursé.
    </div>
  )}
</div>
);
}
