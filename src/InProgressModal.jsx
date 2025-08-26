// src/components/InProgressModal.jsx
import React from "react";

export default function InProgressModal({ isOpen, onClose, report, solidaire, onComplete }) {
  if (!isOpen || !report || !solidaire) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-11/12 animate-fade-in">
        <h2 className="text-lg font-bold mb-4">Dépannage en cours</h2>

        <p className="mb-2"><strong>Solidaire :</strong> {solidaire.name}</p>
        <p className="mb-2"><strong>Sinistré :</strong> {report.ownerName || report.ownerEmail}</p>
        <p className="mb-2"><strong>Montant :</strong> {report.frais} €</p>
        <p className="mb-2"><strong>Localisation :</strong> {report.latitude}, {report.longitude}</p>
        {report.materiel && <p className="mb-2"><strong>Matériel :</strong> {report.materiel}</p>}

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { onComplete(report.id); onClose(); }}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
          >
            ✅ Terminer le dépannage
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
