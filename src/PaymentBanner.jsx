import React, { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

// Clé publique Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

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
          onPaymentSuccess("pending");

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
export default function PaymentBanner({ report, solidaire, currentUser }) {
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  // 🔒 Protection complète contre undefined
  if (!report || !solidaire || !currentUser) return null;

  const isSolidaire = currentUser.uid === solidaire.uid;


    // Création du PaymentIntent
    const handleCreateEscrow = async () => {
        if (!solidaire?.stripeAccountId) {
          toast.error("❌ Solidaire non enregistré sur Stripe. Veuillez compléter son onboarding.");
          return;
        }
      try {
        const response = await fetch("http://localhost:4242/create-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportId: report.id,
            amount: report.frais,
            solidaireStripeId: solidaire.stripeAccountId || null, // ✅ null si pas encore onboardé
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

  // Libération et remboursement inchangés
  const handleReleaseEscrow = async () => {
    if (!report?.paymentIntentId) return;
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
      if (data.success) setPaymentStatus("released");
      else toast.error("❌ Impossible de libérer le paiement");
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur côté client");
    }
  };

  const handleRefundEscrow = async () => {
    if (!report?.paymentIntentId) return;
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
      if (data.success) setPaymentStatus("refunded");
      else toast.error("❌ Impossible de rembourser");
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur côté client");
    }
  };

  return (

  <div className="fixed top-6 left-1/2 -translate-x-1/2 w-[420px] bg-white border border-gray-200 shadow-xl rounded-2xl p-6 z-[9999] pointer-events-auto">
    {/* --- Progress Bar --- */}
    <div className="relative mb-6">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Paiement</span>
        <span>Intervention</span>
        <span>Terminé</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            paymentStatus === null
              ? "w-1/4 bg-gray-400"
              : paymentStatus === "initiated"
              ? "w-1/2 bg-blue-500"
              : paymentStatus === "pending"
              ? "w-2/3 bg-yellow-500"
              : paymentStatus === "released"
              ? "w-full bg-green-600"
              : paymentStatus === "refunded"
              ? "w-full bg-red-500"
              : "w-0"
          }`}
        ></div>
      </div>
    </div>
  {/* Solidaire doit créer un compte Stripe */}
  {!solidaire?.stripeAccountId && solidaire?.uid && solidaire?.email && isSolidaire ? (
    <div className="text-center">
      <p className="text-gray-700">
        ℹ️ Pour recevoir votre paiement, vous devez créer un compte Stripe.
      </p>
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
        className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition"
      >
        🚀 Créer mon compte Stripe
      </button>
    </div>
  ) : (
    <>
      {/* Titre */}
      <h2 className="text-center text-lg font-semibold mb-2">
        {paymentStatus === "pending" || paymentStatus === "released"
          ? `🚗 ${solidaire.name} est en route !`
          : "💳 Paiement requis"}
      </h2>

      {/* Frais */}
      <p className="text-center text-gray-600 mb-4">
        💰 Frais : <span className="font-bold text-gray-900">{report.frais} €</span>
      </p>

      {/* --- ÉTATS --- */}

      {/* 1. Pas encore payé → bouton sinistré */}
      {paymentStatus === null && isSinistre && (
        <button
          onClick={handleCreateEscrow}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition"
        >
          🔒 Payer et séquestrer les fonds
        </button>
      )}

      {/* 2. Checkout Stripe affiché */}
      {clientSecret && paymentStatus === "initiated" && (
        <Elements stripe={stripePromise}>
          <StripeCheckout
            clientSecret={clientSecret}
            onPaymentSuccess={setPaymentStatus}
            report={report}
          />
        </Elements>
      )}

      {/* 3. Paiement bloqué */}
      {paymentStatus === "pending" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center space-y-3">
          <p className="text-green-700 font-medium">
            ✅ Paiement bloqué — le solidaire peut intervenir.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReleaseEscrow}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-3 rounded-lg transition"
            >
              ✅ Terminer
            </button>
            <button
              onClick={handleRefundEscrow}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded-lg transition"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      )}

      {/* 4. Intervention terminée */}
      {paymentStatus === "released" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center text-blue-700 font-medium">
          🎉 Intervention terminée, paiement libéré au solidaire.
        </div>
      )}

      {/* 5. Remboursé */}
      {paymentStatus === "refunded" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center text-red-700 font-medium">
          💸 Paiement remboursé au sinistré.
        </div>
      )}
    </>
  )}
</div>
  );
}
