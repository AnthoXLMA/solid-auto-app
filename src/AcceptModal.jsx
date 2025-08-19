import React from "react";

export default function AcceptModal({ isOpen, onClose, report, onConfirm }) {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-4">Confirmer le dépannage</h2>
        <p className="mb-6">
          Souhaitez-vous <strong>conserver</strong> les frais de la course (frais
          kilométriques + 20%) ou les <strong>annuler</strong> ?
        </p>

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(report, true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Conserver les frais
          </button>
          <button
            onClick={() => onConfirm(report, false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Annuler les frais
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-gray-500 hover:underline"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
