// src/UserReports.jsx
import React from "react";

export default function UserReports({ userReports, users, cancelReport }) {
  if (!userReports || userReports.length === 0) {
    return <p className="text-center text-gray-500">Aucune panne en cours 🚗</p>;
  }

  // Helper pour trouver le solidaire lié à une panne
  const findHelper = (helperUid) =>
    users.find((u) => u.uid === helperUid) || null;

  return (
    <div className="space-y-3">
      {userReports.map((report) => {
        const helper = findHelper(report.helperUid);

        return (
          <div
            key={report.id}
            className="p-3 bg-gray-50 rounded-lg shadow flex flex-col space-y-2"
          >
            {/* Type de panne */}
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">
                {report.nature || "Panne"}
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  report.status === "en attente"
                    ? "bg-yellow-100 text-yellow-800"
                    : report.status === "aide en cours"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-gray-200 text-gray-600"
                }`}
              >
                {report.status}
              </span>
            </div>

            {/* Infos sur l’aide */}
            {helper && (
              <p className="text-sm text-gray-600">
                Aidé par : <span className="font-medium">{helper.name || helper.username || helper.email}</span>
              </p>
            )}

            {/* Bouton Annuler (si c’est bien le report du user) */}
            <button
              onClick={() => cancelReport(report.id)}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white text-sm px-3 py-1 rounded-lg self-start"
            >
              ❌ Annuler
            </button>
          </div>
        );
      })}
    </div>
  );
}
