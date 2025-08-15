import React, { useState } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat"; // composant chat par panne

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState([43.4923, -1.4746]); // Bayonne par défaut

  const [reports, setReports] = useState([
    {
      id: "report-1",
      latitude: 43.4925,
      longitude: -1.4740,
      nature: "batterie",
      message: "Plus de batterie, cherche des pinces",
      status: "en-attente",
      address: "Rue des Fleurs, Bayonne",
    },
  ]);

  const [solidaires, setSolidaires] = useState([]);

  // Panne sélectionnée pour le chat
  const [activeReport, setActiveReport] = useState(null);

  const handleAddSolidaire = (solidaire) => {
    setSolidaires([...solidaires, solidaire]);
  };

  const handleNewReport = (newReport) => {
    setReports([
      ...reports,
      { ...newReport, id: `report-${reports.length + 1}` },
    ]);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
      }}
    >
      {!user ? (
        <Auth setUser={setUser} onBecomeSolidaire={handleAddSolidaire} />
      ) : (
        <>
          <h2>Bienvenue {user.email}</h2>

          {/* Carte avec clic sur une panne */}
          <MapView
            reports={reports}
            solidaires={solidaires}
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
            onReportClick={setActiveReport} // sélection d'une panne
          />

          {/* Formulaire de signalement */}
          <ReportForm
            userPosition={currentPosition}
            onNewReport={handleNewReport}
          />

          {/* Chat pour la panne active */}
          {activeReport && <Chat report={activeReport} user={user} />}
        </>
      )}
    </div>
  );
}
