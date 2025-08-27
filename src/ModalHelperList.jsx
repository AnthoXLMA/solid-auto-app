// ModalHelperList.jsx
import React from "react";
import { getDistanceKm } from "./utils/distance";


export default function ModalHelperList({ helpers, onClose, userPosition, onAlert }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 overflow-y-auto max-h-[80vh]">
        <h3 className="text-center text-xl font-bold mb-4">Helpers disponibles</h3>

        {helpers.map(h => {
          const distance = getDistanceKm(userPosition[0], userPosition[1], h.latitude, h.longitude);
          return (
            <div key={h.uid} className="flex items-center justify-between border-b py-2">
              <div>
                <div className="font-medium">{h.name}</div>
                <div className="text-sm text-gray-500">Matériel: {h.materiel.join(", ")}</div>
                <div className="text-sm text-gray-400">Distance: {distance} km</div>
              </div>
              <button
                onClick={() => onAlert(h)}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg"
              >
                ⚡ Alerter
              </button>
            </div>
          );
        })}

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
