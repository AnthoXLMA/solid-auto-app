import React, { useState } from "react";
import { PANNE_TYPES } from "./constants/pannes";

export default function ReportForm({ userPosition, onNewReport, onClose }) {
  const [nature, setNature] = useState(PANNE_TYPES[0].value);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPosition) return;

    onNewReport({
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature,
      message,
      status: "en-attente",
      address: "Adresse inconnue",
    });

    setMessage("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
        <h3 className="text-center text-xl font-bold mb-6">Signaler une panne</h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {PANNE_TYPES.map((p) => (
            <div
              key={p.value}
              onClick={() => setNature(p.value)}
              className={`flex flex-col items-center justify-center p-3 h-24 rounded-lg border cursor-pointer transition-transform transform hover:scale-105 ${
                nature === p.value ? "border-blue-600 bg-blue-50" : "border-gray-300 bg-white"
              }`}
            >
              <div className="text-3xl mb-2">{p.icon}</div>
              <div className="text-xs text-center font-medium">{p.label}</div>
            </div>
          ))}
        </div>

        <textarea
          placeholder="Ajoutez un message (optionnel)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full p-3 border rounded-lg mb-6 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
          rows={3}
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border bg-gray-200 hover:bg-gray-300 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}
