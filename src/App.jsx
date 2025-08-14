import React, { useState } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm"

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState([43.4923, -1.4746]); // Bayonne par défaut
  const [reports, setReports] = useState([
    {
      latitude: 43.4925,
      longitude: -1.4740,
      nature: "batterie",
      message: "Plus de batterie, cherche des pinces",
      status: "en-attente",
      address: "Rue des Fleurs, Bayonne",
    },
  ]);
  const [solidaires, setSolidaires] = useState([]);

    const handleAddSolidaire = (solidaire) => {
      setSolidaires([...solidaires, solidaire]);
    };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "20px" }}>
      {!user ? (
        <Auth setUser={setUser} onBecomeSolidaire={handleAddSolidaire} />
      ) : (
        <>
          <h2>Bienvenue {user.email}</h2>

          <MapView
            reports={reports}
            solidaires={solidaires}
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
          />

          <ReportForm
            userPosition={currentPosition}
            onNewReport={(newReport) => setReports([...reports, newReport])}
          />
        </>
      )}
    </div>
  );
}
