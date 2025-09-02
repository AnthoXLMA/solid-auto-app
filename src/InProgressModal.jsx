import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getDistanceKm } from "./utils/distance";
import PaymentBanner from "./PaymentBanner";

export default function InProgressModal({
  isOpen,
  onClose,
  report,
  solidaire,
  setPaymentStatus,
  onComplete,
  userPosition,
}) {
  const [loading, setLoading] = useState(false);
  const [arrived, setArrived] = useState(false);
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!isOpen || !userPosition || !report) return;
    const interval = setInterval(() => {
      if (report.latitude && report.longitude) {
        const dist = getDistanceKm(
          userPosition[0],
          userPosition[1],
          report.latitude,
          report.longitude
        );
        setDistance(dist.toFixed(2));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isOpen, userPosition, report]);

  const handleArrived = () => {
    if (!arrived) {
      setArrived(true);
      toast.info("✅ Arrivée confirmée");
    }
  };

  const handleComplete = async () => {
    if (!arrived) {
      toast.warn("⚠️ Confirmez votre arrivée avant de libérer le paiement");
      return;
    }

    if (!report.frais || report.frais <= 0) {
      toast.success("✅ Dépannage terminé (sans paiement) !");
      onComplete?.(report.id);
      onClose?.();
      return;
    }

    setLoading(true);
    try {
      setPaymentStatus?.("releasing");
      const response = await fetch("http://localhost:4242/release-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, paymentIntentId: report.paymentIntentId }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success("💸 Paiement libéré !");
        setPaymentStatus?.("released");
      } else {
        toast.error(`❌ Erreur libération paiement : ${result.error}`);
      }
      onComplete?.(report.id);
      onClose?.();
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la libération du paiement");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !report || !solidaire) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Dépannage en cours</h2>
        <p><strong>Solidaire :</strong> {solidaire.name}</p>
        <p><strong>Sinistré :</strong> {report.ownerName || report.ownerEmail}</p>
        <p><strong>Montant :</strong> {report.frais} €</p>
        {distance && <p><strong>Distance restante :</strong> {distance} km</p>}
        {report.materiel && <p><strong>Matériel :</strong> {report.materiel}</p>}

        <PaymentBanner
          report={report}
          solidaire={solidaire}
          currentUser={{ uid: solidaire.uid }}
          isSinistre={false}
        />

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleArrived}
            disabled={arrived}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition ${arrived ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}
          >
            {arrived ? "✅ Arrivée confirmée" : "📍 Arrivé sur place"}
          </button>
          <button
            onClick={handleComplete}
            disabled={loading || !arrived}
            className={`flex-1 px-4 py-2 rounded-lg text-white transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700"}`}
          >
            ✅ {loading ? "Libération en cours..." : "Terminer le dépannage"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
          >
            🔒 Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
