// --- MapView.jsx ---
import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc, collection, query, where, getDocs, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import ActiveRepairModal from "./ActiveRepairModal";
import PaymentBanner from "./PaymentBanner";
import ModalHelperList from "./ModalHelperList";
import { getDistanceKm } from "./utils/distance";
import { findHelpers } from "./utils/matching";

// === Icônes ===
const currentUserIcon = new L.Icon({ iconUrl: "https://img.icons8.com/?size=100&id=fsoiqMUp0O4v&format=png&color=000000", iconSize: [60, 60] });
const reportIcon = new L.Icon({ iconUrl: "https://img.icons8.com/?size=100&id=U12vJQsF1INo&format=png&color=000000", iconSize: [45, 45] });

const getSolidaireIconWithBadge = (status, pendingAlertsCount) => {
  let baseIconUrl;
  switch (status) {
    case "alerted": baseIconUrl = "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000"; break;
    case "busy": baseIconUrl = "https://img.icons8.com/?size=100&id=59817&format=png&color=000000"; break;
    case "offline":
      return L.divIcon({
        className: "solidaire-offline-icon",
        html: `<div style="position: relative; display: inline-block; text-align:center;">
                <span style="font-size:28px; color:gray;">👤</span>
                ${pendingAlertsCount ? `<span class="pulse-badge">${pendingAlertsCount}</span>` : ""}
               </div>`,
        iconSize: [35, 35],
        iconAnchor: [18, 18],
      });
    default: baseIconUrl = "https://img.icons8.com/?size=100&id=hwOJ5x33ywg6&format=png&color=000000";
  }

  if (!pendingAlertsCount) return new L.Icon({ iconUrl: baseIconUrl, iconSize: [45, 45] });
  return L.divIcon({
    className: "solidaire-badge-icon",
    html: `<div style="position: relative; display: inline-block;">
             <img src="${baseIconUrl}" style="width:35px;height:35px;"/>
             <span class="pulse-badge">${pendingAlertsCount}</span>
           </div>`,
    iconSize: [35, 35],
    iconAnchor: [18, 18],
  });
};

// --- Utilitaires Map ---
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => { if (position) map.setView(position, 15); }, [position, map]);
  return null;
}

function FlyToLocation({ alert }) {
  const map = useMap();
  useEffect(() => {
    if (!alert) return;
    const { latitude, longitude } = alert;
    if (typeof latitude !== "number" || typeof longitude !== "number") return;
    map.flyTo([latitude, longitude], 15, { animate: true });
    toast.info("📍 Zoom sur la panne sélectionnée");
  }, [alert, map]);
  return null;
}

// --- Marker solidaire sécurisé ---
const SolidaireMarker = ({ solidaire, status, alertCount, distance, onAlertUser }) => {
  const dist = typeof distance === "number" && !isNaN(distance) ? distance : 0;
  return (
    <Marker position={[solidaire.latitude, solidaire.longitude]} icon={getSolidaireIconWithBadge(status, alertCount)}>
      <Popup>
        <strong>👤 {solidaire.name}</strong> <br />
        Rôle : {solidaire.role || "Non spécifié"} <br />
        Matériel : {Array.isArray(solidaire.materiel) ? solidaire.materiel.join(", ") : solidaire.materiel || "Non spécifié"} <br />
        📏 Distance : {dist.toFixed(1)} km <br />
        {status === "available" && <span>✅ Disponible</span>}
        {status === "offline" && <span>⚪ Indisponible</span>}
        {status === "alerted" && <span>⏳ En attente de réponse</span>}
        {status === "busy" && <span>⏳ Aide en cours</span>}
        {status === "available" && <button onClick={() => onAlertUser(solidaire)}>⚡ Alerter</button>}
      </Popup>
    </Marker>
  );
};

// --- MapView principal ---
const MapView = forwardRef(({
  reports = [], solidaires = [], alerts = [], userPosition,
  onReportClick, onAlertUser, activeReport, selectedAlert,
  cancelReport, currentUserUid, showHelperList, setShowHelperList, setSelectedAlert
}, ref) => {
  const mapRef = useRef(null);
  useImperativeHandle(ref, () => ({ recenter: () => { if (mapRef.current && userPosition) mapRef.current.setView(userPosition, 15); } }));

  const [currentReport, setCurrentReport] = useState(null);
  const [showInProgress, setShowInProgress] = useState(false);

  if (!Array.isArray(userPosition) || userPosition.length < 2) return <div>📍 Localisation en cours...</div>;

  const filteredSolidairesWithCoords = findHelpers(solidaires, activeReport, alerts, currentUserUid).slice(0, 10);

  // --- calcul distance sécurisé ---
  const distances = {};
  filteredSolidairesWithCoords.forEach((s) => {
    if (s.latitude != null && s.longitude != null && Array.isArray(userPosition) && userPosition.length === 2) {
      const d = Number(getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude));
      distances[s.uid] = isNaN(d) ? 0 : d;
    } else {
      distances[s.uid] = 0;
    }
  });

  return (
    <div className="relative w-full h-screen z-0">
      <MapContainer
        center={userPosition}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        ref={mapRef}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <SetViewOnUser position={userPosition} />
        {selectedAlert && <FlyToLocation alert={reports.find(r => r.id === selectedAlert.reportId)} />}

        <Marker position={userPosition} icon={currentUserIcon}>
          <Popup>🙋‍♂️ Vous êtes ici</Popup>
        </Marker>

        {reports.map((report) => (
          <Marker key={report.id} position={[report.latitude, report.longitude]} icon={reportIcon} eventHandlers={{ click: () => onReportClick(report) }}>
            <Popup>
              <strong>⚠️ Panne :</strong> {report.nature} <br />
              {report.ownerUid === currentUserUid && <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>}
            </Popup>
          </Marker>
        ))}

        {filteredSolidairesWithCoords.map((s) => {
          const isOffline = !s.online;
          const alertForSolidaire = activeReport && alerts
            ? alerts.find(a => a.reportId === activeReport.id && a.toUid === s.uid)
            : null;

          let status = "available";
          if (isOffline) status = "offline";
          else if (activeReport?.helperUid === s.uid) {
            if (activeReport.helperConfirmed && activeReport.status === "aide en cours") status = "busy";
            else if (!activeReport.helperConfirmed && alertForSolidaire) status = "alerted";
          }

          return (
            <SolidaireMarker
              key={s.uid}
              solidaire={s}
              status={status}
              alertCount={alerts?.filter(a => a.toUid === s.uid).length || 0}
              distance={distances[s.uid]}
              onAlertUser={onAlertUser}
            />
          );
        })}
      </MapContainer>
    </div>
  );
});

export default MapView;
