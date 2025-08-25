// src/PayButton.jsx
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe("pk_test_TA_CLE_PUBLIQUE"); // ⚠️ Mets ta vraie clé publique

export default function PayButton({ report }) {
  const handleCheckout = async () => {
    const stripe = await stripePromise;

    const res = await fetch("/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportId: report.id,
        amount: 2500, // en centimes → 25 €
      }),
    });

    const session = await res.json();
    await stripe.redirectToCheckout({ sessionId: session.id });
  };

  return (
    <button
      onClick={handleCheckout}
      className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700"
    >
      💳 Payer le dépannage
    </button>
  );
}
