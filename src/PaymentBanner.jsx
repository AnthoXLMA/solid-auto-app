import React, { useState } from "react";
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

        if (pi.status === "requires_capture" || pi.status === "succeeded") {
          setStatus("✅ Paiement validé !");
          onPaymentSuccess("pending"); // statut pending

          // Mise à jour Firestore
          const reportRef = doc(db, "reports", report.id);
          await updateDoc(reportRef, { escrowStatus: "created" });

          toast.success(`💰 Paiement validé ! ${report.helperName} peut intervenir.`);
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

  // Création du PaymentIntent
  const handleCreateEscrow = async () => {
    if (!solidaire.stripeAccountId) {
      toast.error("❌ Solidaire non enregistré sur Stripe. Veuillez compléter son onboarding.");
      return;
    }

    try {
      console.log("💳 Solidaire pour paiement :", solidaire);
      const response = await fetch("http://localhost:4242/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          amount: report.frais,
          solidaireStripeId: solidaire.stripeAccountId,
        }),
      });
      const data = await response.json();

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaymentStatus("initiated");
      } else {
        toast.error("❌ Impossible de créer le séquestre");
      }
    } catch (err) {
      console.error("Erreur createEscrow frontend:", err);
      toast.error("❌ Erreur côté client");
    }
  };

  // Libération du paiement
  const handleReleaseEscrow = async () => {
    try {
      const response = await fetch("http://localhost:4242/release-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          paymentIntentId: report.paymentIntentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus("released");
        toast.success("✅ Paiement libéré !");
      } else {
        toast.error("❌ Impossible de libérer le paiement");
      }
    } catch (err) {
      console.error("Erreur releaseEscrow frontend:", err);
      toast.error("❌ Erreur côté client");
    }
  };

  // Remboursement
  const handleRefundEscrow = async () => {
    try {
      const response = await fetch("http://localhost:4242/refund-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId: report.id,
          paymentIntentId: report.paymentIntentId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus("refunded");
        toast.success("💸 Paiement remboursé");
      } else {
        toast.error("❌ Impossible de rembourser");
      }
    } catch (err) {
      console.error("Erreur refundEscrow frontend:", err);
      toast.error("❌ Erreur côté client");
    }
  };

  return (
    <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[400px] bg-white border border-gray-200 shadow-lg rounded-2xl p-5 z-[9999] pointer-events-auto">
      {!solidaire.stripeAccountId ? (
        <div className="text-center p-4">
          ℹ️ Vous devez créer un compte Stripe pour recevoir le paiement.
          <button
            onClick={async () => {
              const res = await fetch("http://localhost:4242/create-stripe-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: solidaire.uid, email: solidaire.email }),
              });
              const data = await res.json();
              if (data.url) window.location.href = data.url;
            }}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
          >
            Créer mon compte Stripe
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-center text-lg font-semibold mb-2">
            {paymentStatus === "pending" || paymentStatus === "released"
              ? `🚗 ${solidaire.name} est en route !`
              : "💳 Paiement requis"}
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
                report={report}
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
        </>
      )}
    </div>
  );
}
