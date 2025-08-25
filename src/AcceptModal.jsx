// src/AcceptModal.jsx
import React, { useState } from "react";

export default function AcceptModal({ isOpen, onClose, alerte, onConfirm }) {
  const [montant, setMontant] = useState(0);

  if (!isOpen || !alerte) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>
        <p className="mb-4 text-sm text-gray-700">
          Souhaitez-vous <strong>conserver</strong> les frais de la course
          (frais kilométriques + 20%) ou les <strong>annuler</strong> ?
        </p>

        {/* Champ pour saisir le montant si nécessaire */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Montant estimé (€)</label>
          <input
            type="number"
            value={montant}
            onChange={(e) => setMontant(Number(e.target.value))}
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Ex: 25"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(alerte, montant, false)}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            ✅ Conserver les frais
          </button>
          <button
            onClick={() => onConfirm(alerte, 0, true)}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            🙌 Annuler les frais
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:underline w-full"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
