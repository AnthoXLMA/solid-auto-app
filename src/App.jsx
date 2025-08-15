import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat"; // composant chat par panne

export default function App() {
  const [user, setUser] = useState(null);

  // On commence par null, on mettra à jour dès qu'on récupère la position réelle
  const [currentPosition, setCurrentPosition] = useState(null);

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
  const [activeReport, setActiveReport] = useState(null); // Panne sélectionnée pour le chat

  // Geolocalisation automatique
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn(
            "Impossible de récupérer la position, fallback à Bayonne",
            err
          );
          setCurrentPosition([43.4923, -1.4746]); // fallback Bayonne
        }
      );
    } else {
      console.warn("Géolocalisation non supportée par ce navigateur");
      setCurrentPosition([43.4923, -1.4746]); // fallback Bayonne
    }
  }, []);

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

          {/* Carte */}
          <MapView
            reports={reports}
            solidaires={solidaires}
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
            onReportClick={setActiveReport}
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
