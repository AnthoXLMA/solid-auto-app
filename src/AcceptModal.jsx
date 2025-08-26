import React, { useState } from "react";

export default function AcceptModal({ isOpen, onClose, alerte, onConfirm }) {
  const [montant, setMontant] = useState(0);

  if (!isOpen || !alerte) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>
        <p className="mb-4 text-sm text-gray-700">
          Souhaitez-vous <strong>conserver</strong> les frais de la course
          (frais kilométriques + 20%) ou les <strong>annuler</strong> ?
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
            onClick={() => onConfirm(alerte, montant, false)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            ✅ Conserver les frais
          </button>
          <button
            onClick={() => onConfirm(alerte, 0, true)}
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
