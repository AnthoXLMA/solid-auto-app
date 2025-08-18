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

// 🔹 Icône spéciale si pertinent pour la panne
const solidaireHighlightIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png", // icône verte (ou autre)
  iconSize: [30, 30],
});

// 🔹 Icône pour solidaire déjà alerté
const solidaireAlertedIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/597/597177.png", // téléphone par ex.
  iconSize: [30, 30],
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

      {/* Marqueurs des solidaires */}
      {solidaires.map((s) => {
        let iconToUse = solidaireIcon;

        // 1️⃣ Si déjà alerté → icône spéciale
        if (activeReport && activeReport.helperUid === s.uid) {
          iconToUse = solidaireAlertedIcon;
        }
        // 2️⃣ Sinon, si pertinent pour la panne → icône surlignée
        else if (
          activeReport &&
          s.materiel &&
          activeReport.nature &&
          s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
        ) {
          iconToUse = solidaireHighlightIcon;
        }

        return (
          <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={iconToUse}>
            <Popup>
              <strong>👤 {s.name}</strong> <br />
              Matériel : {s.materiel} <br />
              {activeReport && activeReport.helperUid === s.uid ? (
                <span style={{ color: "orange", fontWeight: "bold" }}>
                  📞 Déjà alerté – en attente
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
