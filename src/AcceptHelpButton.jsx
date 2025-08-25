// src/AcceptHelpButton.jsx
import React, { useState } from "react";
import ModalPortal from "./ModalPortal";

export default function AcceptHelpButton({ report, onAccept }) {
  const [showModal, setShowModal] = useState(false);

  const handleConfirm = () => {
    onAccept(report); // logique pour valider
    setShowModal(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700"
      >
        ✅ Proposer mon aide
      </button>

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <h3 className="text-lg font-bold mb-4">Confirmer votre aide</h3>
          <p className="mb-4">
            Voulez-vous vraiment proposer votre aide pour la panne :
            <strong> {report.nature}</strong> ?
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleConfirm}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
            >
              Oui
            </button>
            <button
              onClick={() => setShowModal(false)}
              className="flex-1 bg-gray-300 text-black px-4 py-2 rounded-lg hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </ModalPortal>
      )}
    </>
  );
}
