import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase";

// Icônes
const currentUserIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=fsoiqMUp0O4v&format=png&color=000000",
  iconSize: [60, 60],
});

const reportIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=U12vJQsF1INo&format=png&color=000000",
  iconSize: [45, 45],
});

const getSolidaireIconWithBadge = (status, pendingAlertsCount) => {
  let baseIconUrl;
  switch (status) {
    case "alerted":
      baseIconUrl =
        "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000";
      break;
    case "confirmed":
      baseIconUrl =
        "https://img.icons8.com/?size=100&id=63227&format=png&color=000000";
      break;
    default:
      baseIconUrl =
        "https://img.icons8.com/?size=100&id=hwOJ5x33ywg6&format=png&color=000000";
  }

  if (!pendingAlertsCount) {
    return new L.Icon({
      iconUrl: baseIconUrl,
      iconSize: [45, 45],
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

// === Utilitaire distance (Haversine) ===
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // rayon Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1); // distance en km arrondie à 0.1
}

// Recentrage
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

// FlyTo
function FlyToLocation({ alert }) {
  const map = useMap();
  useEffect(() => {
    if (!alert) return;
    const { latitude, longitude } = alert;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
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
  selectedAlert,
  cancelReport,
}) {
  // Suivi temps réel du report actif
  useEffect(() => {
    if (!activeReport) return;

    const reportRef = doc(db, "reports", activeReport.id);
    const unsub = onSnapshot(reportRef, (docSnap) => {
      if (!docSnap.exists()) {
        toast.info("🗑️ La demande de dépannage a été annulée.");
        cancelReport(activeReport.id);
      } else {
        const data = docSnap.data();
        if (data.status !== activeReport.status) {
          onReportClick({
            ...activeReport,
            status: data.status,
            helperUid: data.helperUid,
          });
        }
      }
    });

    return () => unsub();
  }, [activeReport, cancelReport, onReportClick]);

  // FlyTo sur alerte
  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find((r) => r.id === selectedAlert.reportId);
    if (report && report.latitude && report.longitude) {
      alertLocation = { latitude: report.latitude, longitude: report.longitude };
    }
  }

  // Sécurité localisation
  if (
    !userPosition ||
    userPosition.length < 2 ||
    userPosition[0] == null ||
    userPosition[1] == null
  ) {
    return <div>📍 Localisation en cours...</div>;
  }

  // === Filtrage des solidaires ===
  const filteredSolidaires = activeReport
    ? solidaires.filter((s) => {
        // Exemple : vérifier si le solidaire possède le bon matériel
        return (
          !s.materiel ||
          s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
        );
      })
    : solidaires;

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

      <SetViewOnUser position={userPosition} />
      {alertLocation && <FlyToLocation alert={alertLocation} />}

      {/* Utilisateur */}
      <Marker position={userPosition} icon={currentUserIcon}>
        <Popup>🙋‍♂️ Vous êtes ici</Popup>
      </Marker>

      {/* Reports */}
      {reports.map((report) => (
        <Marker
          key={report.id}
          position={[report.latitude, report.longitude]}
          icon={reportIcon}
          eventHandlers={{ click: () => onReportClick(report) }}
        >
          <Popup>
            <strong>⚠️ Panne :</strong> {report.nature} <br />
            <button onClick={() => onReportClick(report)}>🔍 Voir détails</button>
            <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>
          </Popup>
        </Marker>
      ))}

      {/* Solidaires filtrés */}
      {filteredSolidaires.map((s) => {
  let status = "relevant";

  // 1️⃣ Vérifie si ce solidaire est concerné par un report
  const reportForSolidaire = reports.find(
    (r) => r.helperUid === s.uid && !["annulé"].includes(r.status)
  );

  if (reportForSolidaire) {
    if (reportForSolidaire.status === "aide confirmée") {
      status = "confirmed";
    } else {
      status = "alerted";
    }
  }

  // 2️⃣ Compte les alertes en attente (uniquement pour soi-même)
  const pendingAlertsCount =
    s.uid === currentUserUid
      ? reports.filter(
          (r) =>
            r.helperUid === s.uid &&
            !["aide confirmée", "annulé"].includes(r.status)
        ).length
      : 0;

  // 3️⃣ Calcule la distance
  const distance = getDistanceKm(
    userPosition[0],
    userPosition[1],
    s.latitude,
    s.longitude
  );

  return (
    <Marker
      key={s.uid}
      position={[s.latitude, s.longitude]}
      icon={getSolidaireIconWithBadge(status, pendingAlertsCount)}
    >
      <Popup>
        <strong>👤 {s.name}</strong> <br />
        Matériel : {s.materiel} <br />
        📏 Distance : {distance} km <br />
        {status === "alerted" && (
          <span style={{ color: "orange" }}>📞 Déjà alerté</span>
        )}
        {status === "confirmed" && (
          <span style={{ color: "green" }}>✅ Aide confirmée</span>
        )}
        {status === "relevant" && s.uid !== currentUserUid && (
          <button onClick={() => onAlertUser(s)}>⚡ Alerter</button>
        )}
      </Popup>
    </Marker>
  );
})}

    </MapContainer>
  );
}
