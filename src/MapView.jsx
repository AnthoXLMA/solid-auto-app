import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase";

// Icônes
const currentUserIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1946/1946429.png",
  iconSize: [35, 35],
  className: "current-user-icon",
});

const reportIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/564/564619.png",
  iconSize: [25, 25],
});

const solidaireHighlightIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [30, 30],
});

// 🔹 Recentrage auto
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

// 🔹 FlyTo sécurisé
function FlyToLocation({ alert }) {
  const map = useMap();
  useEffect(() => {
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

// 🔹 Nouvelle fonction d'icône avec badge
const getSolidaireIconWithBadge = (status, pendingAlertsCount) => {
  let baseIconUrl;
  switch (status) {
    case "alerted":
      baseIconUrl = "https://cdn-icons-png.flaticon.com/512/1828/1828844.png";
      break;
    case "confirmed":
      baseIconUrl = "https://cdn-icons-png.flaticon.com/512/190/190411.png";
      break;
    default:
      baseIconUrl = "https://cdn-icons-png.flaticon.com/512/565/565547.png";
  }

  if (!pendingAlertsCount) {
    return new L.Icon({
      iconUrl: baseIconUrl,
      iconSize: [30, 30],
    });
  }

  return L.divIcon({
    className: "solidaire-badge-icon",
    html: `
      <div style="position: relative; display: inline-block;">
        <img src="${baseIconUrl}" style="width:30px;height:30px;"/>
        <span style="
          position: absolute;
          top: -5px;
          right: -5px;
          background: red;
          color: white;
          font-size: 12px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
        ">
          ${pendingAlertsCount}
        </span>
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

export default function MapView({
  reports,
  solidaires,
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
  currentUserUid,
  selectedAlert,
  cancelReport,
}) {
  // 🔹 Synchronisation en temps réel de activeReport
  useEffect(() => {
    if (!activeReport) return;

    const reportRef = doc(db, "reports", activeReport.id);
    const unsub = onSnapshot(reportRef, (docSnap) => {
      if (!docSnap.exists()) {
        toast.info("🗑️ La demande de dépannage a été annulée.");
        cancelReport(activeReport.id); // ferme la popup
      } else {
        const data = docSnap.data();
        if (data.status !== activeReport.status) {
          onReportClick({ ...activeReport, status: data.status, helperUid: data.helperUid });
        }
      }
    });

    return () => unsub();
  }, [activeReport, cancelReport, onReportClick]);

  // 🔹 Filtrage sécurisé des solidaires
  const filteredSolidaires = solidaires.filter(
    (s) =>
      s.uid &&
      s.uid !== currentUserUid &&
      (!activeReport ||
        (s.materiel &&
          activeReport.nature &&
          s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())))
  );

  // 🔹 Calcul sécurisé des coordonnées pour FlyToLocation
  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find((r) => r.id === selectedAlert.reportId);
    if (report && report.latitude != null && report.longitude != null) {
      alertLocation = { latitude: report.latitude, longitude: report.longitude };
    } else {
      console.warn(
        "FlyToLocation: coordonnées invalides ou report introuvable pour l'alerte",
        selectedAlert
      );
    }
  }

  // 🔹 Rendu conditionnel si pas de localisation
  if (!userPosition) return <div>📍 Localisation en cours...</div>;

  return (
    <MapContainer
      center={userPosition}
      zoom={13}
      style={{ height: "500px", width: "100%" }}
      scrollWheelZoom={true}
    >
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
            <button
              style={{ marginTop: "5px", cursor: "pointer" }}
              onClick={() => onReportClick(report)}
            >
              🔍 Voir détails
            </button>
            <button
              style={{
                marginTop: "5px",
                marginLeft: "5px",
                cursor: "pointer",
                backgroundColor: "#f8d7da",
                border: "none",
              }}
              onClick={() => cancelReport(report.id)}
            >
              ❌ Annuler la panne
            </button>
          </Popup>
        </Marker>
      ))}

      {/* Marqueurs des solidaires */}
      {filteredSolidaires.map((s) => {
        let status = "relevant";
        if (activeReport && activeReport.helperUid === s.uid) {
          status =
            activeReport.status === "aide confirmée" ? "confirmed" : "alerted";
        }

        // 🔹 Calcul du nombre d’alertes en attente
        const pendingAlertsCount = reports.filter(
          (r) => r.helperUid === s.uid && r.status !== "aide confirmée"
        ).length;

        return (
          <Marker
            key={s.uid}
            position={[s.latitude, s.longitude]}
            icon={getSolidaireIconWithBadge(status, pendingAlertsCount)}
          >
            <Popup>
              <strong>👤 {s.name}</strong> <br />
              Matériel : {s.materiel} <br />
              {status === "alerted" && (
                <span style={{ color: "orange", fontWeight: "bold" }}>
                  📞 Déjà alerté – en attente
                </span>
              )}
              {status === "confirmed" && (
                <span style={{ color: "green", fontWeight: "bold" }}>
                  ✅ Aide confirmée !
                </span>
              )}
              {status === "relevant" && (
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
