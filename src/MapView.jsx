import React from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔹 Icônes custom
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
  iconSize: [30, 30],
});

const reportIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
  iconSize: [25, 25],
});

const solidaireIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/2921/2921222.png",
  iconSize: [25, 25],
});

export default function MapView({
  reports,
  solidaires,
  userPosition,
  onPositionChange,
  onReportClick,
  onAlertUser,
  activeReport, // <-- ajouté
}) {
  if (!userPosition) return <div>📍 Localisation en cours...</div>;

  return (
    <MapContainer
      center={userPosition}
      zoom={6}
      style={{ height: "500px", width: "100%" }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Marqueur utilisateur */}
      <Marker position={userPosition} icon={userIcon}>
        <Popup>🙋‍♂️ Vous êtes ici</Popup>
      </Marker>

      {/* Marqueurs des pannes */}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={reportIcon}
          eventHandlers={{
            click: () => onReportClick(report),
          }}
        >
          <Popup>
            <strong>⚠️ Panne :</strong> {report.nature} <br />
            <button
              style={{ marginTop: "5px", cursor: "pointer" }}
              onClick={() => onReportClick(report)}
            >
              🔍 Voir détails
            </button>
          </Popup>
        </Marker>
      ))}

      {/* Marqueurs des solidaires filtrés */}
{solidaires.map((s) => (
  <Marker
    key={s.uid}
    position={[s.latitude, s.longitude]}
    icon={solidaireIcon}
  >
    <Popup>
      <strong>👤 {s.name}</strong> <br />
      Matériel : {s.materiel} <br />
      {activeReport && activeReport.helperUid === s.uid ? (
        <span style={{ color: "orange", fontWeight: "bold" }}>
          ⚠️ Déjà alerté – réponse en attente
        </span>
      ) : (
        <button
          style={{ marginTop: "5px", cursor: "pointer" }}
          onClick={() => onAlertUser(s)}
        >
          ⚡ Alerter
        </button>
      )}
    </Popup>
  </Marker>
))}

    </MapContainer>
  );
}
