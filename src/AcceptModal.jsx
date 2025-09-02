import React, { useState, useEffect } from "react";
import { calculateFees } from "./utils/calculateFees";

export default function AcceptModal({ isOpen, onClose, alerte, onConfirm, onStartRepair }) {
  const distanceKm = alerte?.distance || 0;
  const fraisCalculés = calculateFees(distanceKm);
  const [montant, setMontant] = useState(fraisCalculés);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMontant(fraisCalculés);
  }, [fraisCalculés]);

  if (!isOpen || !alerte) return null;

  const handleConfirm = async (fraisAnnules) => {
    if (loading) return;
    setLoading(true);

    try {
      const finalAmount = fraisAnnules ? 0 : Math.max(0, montant); // sécurité
      await onConfirm?.(alerte, finalAmount, fraisAnnules);
      onClose?.();
      if (onStartRepair) onStartRepair({ ...alerte, frais: finalAmount, helperConfirmed: true });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>
        <p className="mb-4 text-sm text-gray-700">
          Souhaitez-vous <strong>conserver</strong> les frais ({fraisCalculés} € estimés)
          ou les <strong>annuler</strong> ?
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
