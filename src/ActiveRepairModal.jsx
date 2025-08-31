import React, { useEffect, useState } from "react";

export default function ActiveRepairModal({ report, solidaire, userPosition, onComplete }) {
  const [distance, setDistance] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(report.paymentStatus || null);

  // Fonction pour libérer le paiement via le backend
  const handleRelease = async () => {
    try {
      const res = await fetch("http://localhost:4242/release-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, paymentIntentId: report.paymentIntentId }),
      });
      const data = await res.json();
      if (data.success) {
        setPaymentStatus("released");
        onComplete(report.id);
      } else {
        alert(data.error || "Erreur lors de la libération du paiement");
      }
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors de la libération du paiement");
    }
  };

  // Fonction pour rembourser via le backend
  const handleRefund = async () => {
    try {
      const res = await fetch("http://localhost:4242/refund-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId: report.id, paymentIntentId: report.paymentIntentId }),
      });
      const data = await res.json();
      if (data.success) setPaymentStatus("refunded");
      else alert(data.error || "Erreur lors du remboursement");
    } catch (err) {
      console.error(err);
      alert("Erreur réseau lors du remboursement");
    }
  };

  // Calcul distance en temps réel
  useEffect(() => {
    if (!report.latitude || !report.longitude || !userPosition) return;

    const calculateDistance = () => {
      const R = 6371;
      const dLat = ((report.latitude - userPosition[0]) * Math.PI) / 180;
      const dLon = ((report.longitude - userPosition[1]) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((userPosition[0] * Math.PI) / 180) *
          Math.cos((report.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const dist = R * c;
      setDistance(Number(dist.toFixed(1)));
    };

    calculateDistance();
    const interval = setInterval(calculateDistance, 5000);
    return () => clearInterval(interval);
  }, [report.latitude, report.longitude, userPosition]);

  if (!report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white p-6 rounded-xl shadow-lg w-11/12 max-w-md animate-fade-in">
        <h2 className="text-xl font-bold mb-4">Dépannage en cours</h2>

        <p>📍 Sinistré : {report.ownerName} ({report.ownerEmail})</p>
        <p>💰 Montant : {report.frais} €</p>
        <p>🛠 Nature : {report.nature}</p>
        <p>📍 Adresse : {report.address}</p>
        {distance !== null && <p>⏳ Distance restante : {distance} km</p>}
        {/* Paiement */}
        {paymentStatus === null && (
          <button
            onClick={() => setPaymentStatus("pending")}
            className="bg-yellow-400 text-white px-4 py-2 rounded mt-2"
          >
            Bloquer le paiement
          </button>
        )}
        {paymentStatus === "pending" && <p className="text-blue-600 mt-2">⏳ Paiement bloqué, en attente...</p>}
        {paymentStatus === "released" && <p className="text-green-600 mt-2">✅ Paiement effectué !</p>}
        {paymentStatus === "refunded" && <p className="text-red-600 mt-2">⚠️ Paiement remboursé !</p>}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded flex-1"
            onClick={handleRelease}
          >
            Terminé
          </button>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => window.open(`https://maps.google.com?q=${report.latitude},${report.longitude}`, "_blank")}
          >
            Itinéraire
          </button>

          <button
            className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => alert(`Contact: ${report.ownerEmail}`)}
          >
            Contacter
          </button>

          <button
            className="bg-red-500 text-white px-4 py-2 rounded flex-1"
            onClick={handleRefund}
          >
            Annuler / Rembourser
          </button>
        </div>
      </div>
    </div>
  );
}
