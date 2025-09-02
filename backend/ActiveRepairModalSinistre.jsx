// src/ActiveRepairModalSinistre.jsx
import React, { useEffect, useState } from "react";

export default function ActiveRepairModalSinistre({ report, solidaire, userPosition, onRequestRefund, onClose }) {
  const [distance, setDistance] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(report.paymentStatus || null);

  // Calcul distance entre sinistré et solidaire (tracking)
  useEffect(() => {
    if (!report.latitude || !report.longitude || !userPosition) return;

    const calculateDistance = () => {
      const R = 6371; // rayon de la Terre
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
        <h2 className="text-xl font-bold mb-4">🚗 Dépannage en cours</h2>

        <p>🛠 <strong>Solidaire :</strong> {solidaire?.name}</p>
        <p>📍 <strong>Votre position :</strong> {report.address}</p>
        <p>💰 <strong>Montant :</strong> {report.frais} €</p>
        {distance !== null && <p>⏳ <strong>Dépanneur à :</strong> {distance} km</p>}

        {/* Statut paiement */}
        <div className="mt-4">
          {paymentStatus === null && <p className="text-gray-600">💳 Paiement en attente...</p>}
          {paymentStatus === "pending" && <p className="text-blue-600">⏳ Paiement bloqué, en attente du dépanneur...</p>}
          {paymentStatus === "released" && <p className="text-green-600">✅ Paiement libéré au dépanneur</p>}
          {paymentStatus === "refunded" && <p className="text-red-600">⚠️ Paiement remboursé</p>}
        </div>

        {/* Actions disponibles */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => alert(`📞 Contactez le solidaire : ${solidaire?.phone || solidaire?.email}`)}
          >
            Contacter
          </button>

          <button
            className="bg-yellow-500 text-white px-4 py-2 rounded flex-1"
            onClick={() => onRequestRefund?.(report.id)}
          >
            Demander remboursement
          </button>

          <button
            className="bg-gray-500 text-white px-4 py-2 rounded flex-1"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
