import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icônes par défaut Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Icônes custom
const redIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
  iconSize: [32, 32],
});

const greenIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
  iconSize: [32, 32],
});

const blueIcon = new L.Icon({
  iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
  iconSize: [32, 32],
});

export default function MapView({
  reports = [],
  solidaires = [],
  userPosition,
  onPositionChange,
  onReportClick,
}) {
  const defaultPos = [43.4923, -1.4746];
  const [position, setPosition] = useState(userPosition || defaultPos);

  // Fonction pour géolocaliser l'utilisateur à la demande
  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = [pos.coords.latitude, pos.coords.longitude];
          setPosition(newPos);
          if (onPositionChange) onPositionChange(newPos);
        },
        () => {
          if (onPositionChange) onPositionChange(defaultPos);
        }
      );
    }
  };

  useEffect(() => {
    // Si userPosition est défini depuis App.jsx, on l'utilise
    if (userPosition) {
      setPosition(userPosition);
    } else {
      // Sinon, tentative de géolocalisation automatique
      locateUser();
    }
  }, [userPosition]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
      <button
        onClick={locateUser}
        style={{ padding: "8px 12px", alignSelf: "flex-start" }}
      >
        Me géolocaliser
      </button>

      <div style={{ width: "100%", height: "500px" }}>
        <MapContainer center={position} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Marker position actuelle */}
          <Marker position={position} icon={blueIcon}>
            <Popup>Vous êtes ici</Popup>
          </Marker>

          {/* Markers pannes */}
          {reports.map((report) => (
            <Marker
              key={report.id}
              position={[report.latitude || defaultPos[0], report.longitude || defaultPos[1]]}
              icon={redIcon}
            >
              <Popup>
                <strong>{report.nature}</strong>
                <br />
                {report.message}
                <br />
                Statut: {report.status}
                <br />
                Adresse: {report.address}
                <br />
                <button
                  style={{ marginTop: "5px" }}
                  onClick={() => onReportClick && onReportClick(report)}
                >
                  Ouvrir le chat
                </button>
              </Popup>
            </Marker>
          ))}

          {/* Markers solidaires */}
          {solidaires.map((s, i) => (
            <Marker
              key={`solidaire-${i}`}
              position={[s.latitude || defaultPos[0], s.longitude || defaultPos[1]]}
              icon={greenIcon}
            >
              <Popup>
                <strong>{s.name}</strong>
                <br />
                Matériel disponible: {s.materiel || "Non renseigné"}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
