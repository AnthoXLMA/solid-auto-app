import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Icônes...
const currentUserIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png", iconSize: [35, 35], className: "current-user-icon" });
const otherUserIcon = new L.Icon({ iconUrl: "https://img.icons8.com/?size=100&id=AmvvpYN8jrzG&format=png&color=000000", iconSize: [25, 25] });
const reportIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png", iconSize: [25, 25] });
const solidaireIcon = new L.Icon({ iconUrl: "https://img.icons8.com/?size=100&id=AmvvpYN8jrzG&format=png&color=000000", iconSize: [30, 30] });
const solidaireAlertedIcon = new L.Icon({ iconUrl: "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000", iconSize: [40, 40] });
const solidaireHighlightIcon = new L.Icon({ iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png", iconSize: [30, 30] });

// 🔹 Recentrage auto
function SetViewOnUser({ position }) {
  const map = useMap();
  React.useEffect(() => { if (position) map.setView(position, 15); }, [position, map]);
  return null;
}

// 🔹 FlyTo sécurisé
function FlyToLocation({ alert }) {
  const map = useMap();
  React.useEffect(() => {
    if (!alert) return;
    const { latitude, longitude } = alert;
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      console.warn("FlyToLocation: coordonnées invalides détectées", alert);
      return;
    }
    map.flyTo([latitude, longitude], 15, { animate: true });
  }, [alert, map]);
  return null;
}

export default function MapView({
  reports,
  solidaires,
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
  currentUserUid,
  selectedAlert,   // nouvelle prop
}) {
  if (!userPosition) return <div>📍 Localisation en cours...</div>;

  const getIconByStatus = (status) => {
    switch (status) {
      case "relevant": return solidaireHighlightIcon;
      case "alerted": return solidaireAlertedIcon;
      case "irrelevant": return solidaireIcon;
      default: return solidaireIcon;
    }
  };

  const filteredSolidaires = activeReport
    ? solidaires.filter(
        (s) =>
          s.uid !== currentUserUid &&
          s.materiel &&
          activeReport.nature &&
          s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
      )
    : [];

  // 🔹 Calcul sécurisé des coordonnées pour FlyToLocation
  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find(r => r.id === selectedAlert.reportId);
    if (report && report.latitude != null && report.longitude != null) {
      alertLocation = { latitude: report.latitude, longitude: report.longitude };
    } else {
      console.warn("FlyToLocation: coordonnées invalides ou report introuvable pour l'alerte", selectedAlert);
    }
  }

  return (
    <MapContainer center={userPosition} zoom={13} style={{ height: "500px", width: "100%" }} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Recentrage automatique */}
      <SetViewOnUser position={userPosition} />
      {alertLocation && <FlyToLocation alert={alertLocation} />}

      {/* Marqueur utilisateur */}
      <Marker position={userPosition} icon={currentUserIcon}>
        <Popup>🙋‍♂️ Vous êtes ici</Popup>
      </Marker>

      {/* Marqueurs des reports */}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={reportIcon}
          eventHandlers={{ click: () => onReportClick(report) }}
        >
          <Popup>
            <strong>⚠️ Panne :</strong> {report.nature} <br />
            <button style={{ marginTop: "5px", cursor: "pointer" }} onClick={() => onReportClick(report)}>
              🔍 Voir détails
            </button>
          </Popup>
        </Marker>
      ))}

      {/* Marqueurs des solidaires visibles avant panne */}
      {!activeReport &&
        solidaires.filter((s) => s.uid !== currentUserUid).map((s) => (
          <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={otherUserIcon}>
            <Popup>
              <strong>👤 {s.name}</strong> <br /> Matériel : {s.materiel}
            </Popup>
          </Marker>
        ))}

      {/* Marqueurs filtrés après panne */}
      {activeReport &&
        filteredSolidaires.map((s) => {
          let status = "relevant";
          if (activeReport.helperUid === s.uid) {
            status = activeReport.status === "aide confirmée" ? "confirmed" : "alerted";
          }
          return (
            <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={getIconByStatus(status)}>
              <Popup>
                <strong>👤 {s.name}</strong> <br />
                Matériel : {s.materiel} <br />
                {status === "alerted" && <span style={{ color: "orange", fontWeight: "bold" }}>📞 Déjà alerté – en attente</span>}
                {status === "confirmed" && <span style={{ color: "green", fontWeight: "bold" }}>✅ Aide confirmée !</span>}
                {status === "relevant" && <button style={{ marginTop: "5px", cursor: "pointer" }} onClick={() => onAlertUser(s)}>⚡ Alerter</button>}
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
