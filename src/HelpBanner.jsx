import React, { useState, useEffect } from "react";

// Fonction utilitaire pour calculer la distance (Haversine)
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1); // en km
}

function HelpBanner({ report, onComplete }) {
  const [distance, setDistance] = useState(null);

  useEffect(() => {
    if (!report || !report.latitude || !report.longitude) return;

    const interval = setInterval(() => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const dist = getDistanceKm(
            pos.coords.latitude,
            pos.coords.longitude,
            report.latitude,
            report.longitude
          );
          setDistance(dist);
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [report]);

  // ✅ Vérification après les hooks
  if (!report) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#e6f7ff",
        border: "1px solid #91d5ff",
        padding: "10px 16px",
        borderRadius: "0 0 12px 12px",
        zIndex: 2000,
        fontWeight: "bold",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      🚗 Vous êtes en route pour aider{" "}
      <strong>{report.ownerName || "un utilisateur"}</strong>
      {distance && <span>📏 Distance restante : {distance} km</span>}
      <button
        style={{
          marginTop: "6px",
          background: "green",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          padding: "4px 8px",
          cursor: "pointer",
        }}
        onClick={onComplete}
      >
        ✅ Intervention terminée
      </button>
    </div>
  );
}

export default HelpBanner;
