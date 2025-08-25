import React, { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import ModalPortal from "./ModalPortal";

const stripePromise = loadStripe("pk_test_TA_CLE_PUBLIQUE");

export default function PayButton({ report }) {
  const [showModal, setShowModal] = useState(false);

  const handleCheckout = async () => {
    const stripe = await stripePromise;

    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, amount: 2500 }),
    });

    const session = await res.json();
    await stripe.redirectToCheckout({ sessionId: session.id });
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
      >
        💳 Payer le dépannage
      </button>

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <h3>Paiement du dépannage</h3>
          <PayButtonInner report={report} onClose={() => setShowModal(false)} />
        </ModalPortal>
      )}
    </>
  );
}

// Séparer l’appel Stripe du modal pour éviter la récursion
function PayButtonInner({ report }) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;
    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId: report.id, amount: 2500 }),
    });
    const session = await res.json();
    await stripe.redirectToCheckout({ sessionId: session.id });
  };

  return (
    <button
      onClick={handleCheckout}
      className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
    >
      💳 Payer maintenant
    </button>
  );
}
