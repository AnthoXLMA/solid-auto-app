// src/AcceptModal.jsx
import React, { useState, useEffect } from "react";
import { calculateFees } from "./utils/calculateFees";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function AcceptModal({ isOpen, onClose, alerte, onConfirm, onStartRepair }) {
  const distanceKm = alerte?.distance || 0;
  const fraisEstimés = calculateFees(distanceKm);

  const [montant, setMontant] = useState(fraisEstimés);
  const [loading, setLoading] = useState(false);

  // 🔄 Met à jour le montant quand l'alerte change
  useEffect(() => {
    setMontant(fraisEstimés);
  }, [fraisEstimés]);

  if (!isOpen || !alerte) return null;

  const handleConfirm = async (annulerFrais = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const finalAmount = annulerFrais ? 0 : Math.max(0, montant);

      // Appel du callback parent
      await onConfirm?.(alerte, finalAmount, annulerFrais);

      // ⚡ Mise à jour Firestore
      const reportRef = doc(db, "reports", alerte.reportId);
      await updateDoc(reportRef, { frais: finalAmount, helperConfirmed: true });

      // Callback pour démarrer le dépannage si nécessaire
      onStartRepair?.({ ...alerte, frais: finalAmount, helperConfirmed: true });

      onClose?.();
    } catch (err) {
      console.error("Erreur lors de la confirmation :", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>

        <p className="mb-4 text-sm text-gray-700">
          Souhaitez-vous <strong>conserver</strong> les frais (
          {fraisEstimés} € estimés) ou les <strong>annuler</strong> ?
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Montant estimé (€)</label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(Number(e.target.value))}
            min={0}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleConfirm(false)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            ✅ Conserver les frais
          </button>
          <button
            onClick={() => handleConfirm(true)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
          >
            🙌 Annuler les frais
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full text-sm text-gray-500 hover:underline"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
