import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
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

const alertedIcon = new L.Icon({
  // icône différente pour les solidaires déjà alertés
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [28, 28],
});

const loadingIcon = new L.Icon({
  iconUrl: "https://i.gifer.com/ZZ5H.gif", // petit spinner animé
  iconSize: [30, 30],
});

const waitingIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/271/271203.png", // trois points horizontaux
  iconSize: [30, 30],
});

const phoneIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/597/597177.png", // 📞 téléphone
  iconSize: [28, 28],
});



export default function MapView({
  reports,
  solidaires,
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
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
      {solidaires.map((s) => {
        const isAlerted = !!(activeReport && activeReport.helperUid === s.uid);

        return (
          <Marker
            key={`${s.uid}-${isAlerted ? "alerted" : "idle"}`}
            position={[s.latitude, s.longitude]}
            icon={isAlerted ? phoneIcon : solidaireIcon} // 🔹 téléphone si alerté
          >
            <Popup>
              <strong>👤 {s.name}</strong> <br />
              Matériel : {s.materiel} <br />
              {isAlerted ? (
                <span style={{ color: "orange", fontWeight: "bold" }}>
                  📞 Déjà contacté – en attente de réponse
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
        );
      })}
    </MapContainer>
  );
}
