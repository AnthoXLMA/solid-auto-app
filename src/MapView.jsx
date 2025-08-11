import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icônes par défaut Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Composant MapView (affiche la carte + markers)
export function MapView({ reports = [], onPositionChange }) {
  const defaultPos = [43.4923, -1.4746];
  const [position, setPosition] = useState(defaultPos);
  const [hasLocation, setHasLocation] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur");
      if (onPositionChange) onPositionChange(defaultPos);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newPos = [pos.coords.latitude, pos.coords.longitude];
        setPosition(newPos);
        setHasLocation(true);
        if (onPositionChange) onPositionChange(newPos);
      },
      () => {
        alert("Impossible d'obtenir votre position, localisation par défaut activée");
        if (onPositionChange) onPositionChange(defaultPos);
      }
    );
  }, [onPositionChange]);

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "500px", width: "100%" }}
      className="leaflet-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marker position actuelle */}
      <Marker position={position}>
        <Popup>{hasLocation ? "Vous êtes ici" : "Position par défaut : Bayonne"}</Popup>
      </Marker>

      {/* Markers pannes */}
      {reports.map((report, i) => (
        <Marker
          key={i}
          position={[report.latitude || defaultPos[0], report.longitude || defaultPos[1]]}
        >
          <Popup>
            <strong>{report.nature}</strong>
            <br />
            {report.message}
            <br />
            Statut: {report.status}
            <br />
            Adresse: {report.address}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

// Composant parent (ex: App) qui combine carte + texte
export default function App() {
  const [reports, setReports] = useState([
    // exemple d'un rapport
    {
      latitude: 43.4925,
      longitude: -1.4740,
      nature: "voiture-ne-demarre-pas",
      message: "La voiture ne démarre pas du tout",
      status: "en-attente",
      address: "Rue des Fleurs, Bayonne",
    },
  ]);
  const [currentPosition, setCurrentPosition] = useState(null);

  return (
    <div className="map-and-report-container">
      <MapView reports={reports} onPositionChange={setCurrentPosition} />
      <div className="report-text">
        <h2>Signalement de la panne</h2>
        {/* Ici tu peux mettre ton formulaire ou la liste des signalements */}
      </div>
    </div>
  );
}
