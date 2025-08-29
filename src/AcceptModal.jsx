import React, { useState, useEffect } from "react";
import { calculateFees } from "./utils/calculateFees";

/**
 * AcceptModal
 *
 * Props :
 * - isOpen : boolean, si le modal doit s'afficher
 * - onClose : function, ferme le modal
 * - alerte : objet report/alerte sur lequel agir
 * - onConfirm : function, appelée lors de la confirmation du montant
 * - onStartRepair : function optionnelle, lance le modal InProgress pour le solidaire
 */
export default function AcceptModal({ isOpen, onClose, alerte, onConfirm, onStartRepair }) {
  const distanceKm = alerte?.distance || 0;
  const fraisCalculés = calculateFees(distanceKm);

  const [montant, setMontant] = useState(fraisCalculés);

  // 🔄 Recalculer montant si alerte change
  useEffect(() => {
    setMontant(fraisCalculés);
  }, [fraisCalculés]);

  if (!isOpen || !alerte) return null;

  const handleConfirm = (fraisAnnules) => {
    // 1️⃣ Mettre à jour le paiement / frais côté backend
    onConfirm(alerte, fraisAnnules ? 0 : montant, fraisAnnules);
    // 2️⃣ Fermer le modal actuel
    onClose();
    // 3️⃣ Lancer le modal solidaire en cours si fourni
    if (onStartRepair) onStartRepair(alerte);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>
        <p className="mb-4 text-sm text-gray-700">
          Souhaitez-vous <strong>conserver</strong> les frais de la course ({fraisCalculés} € estimés)
          ou les <strong>annuler</strong> ?
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Montant estimé (€)</label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex: 25"
          />
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => handleConfirm(false)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ✅ Conserver les frais
          </button>
          <button
            onClick={() => handleConfirm(true)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
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
