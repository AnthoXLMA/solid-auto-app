import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { toast } from "react-toastify";

// Modals
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import ModalHelperList from "./ModalHelperList";

// Utils
import { getDistanceKm } from "./utils/distance";

// === Icônes ===
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
      baseIconUrl = "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000";
      break;
    case "busy":
      baseIconUrl = "https://img.icons8.com/?size=100&id=59817&format=png&color=000000";
      break;
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
    default:
      baseIconUrl = "https://img.icons8.com/?size=100&id=hwOJ5x33ywg6&format=png&color=000000";
  }

  if (!pendingAlertsCount)
    return new L.Icon({ iconUrl: baseIconUrl, iconSize: [45, 45] });

  return L.divIcon({
    className: "solidaire-badge-icon",
    html: `<div style="position: relative; display: inline-block;">
             <img src="${baseIconUrl}" style="width:35px;height:35px;"/>
             ${status === "alerted" && pendingAlertsCount
               ? `<span class="pulse-badge">${pendingAlertsCount}</span>`
               : (pendingAlertsCount ? `<span class="badge">${pendingAlertsCount}</span>` : "")}
           </div>`,
    iconSize: [35, 35],
    iconAnchor: [18, 18],
  });
};

// --- Utilitaires Map ---
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position && position[0] != null && position[1] != null) map.setView(position, 15);
  }, [position, map]);
  return null;
}

function FlyToLocation({ alert }) {
  const map = useMap();
  useEffect(() => {
    if (!alert || alert.latitude == null || alert.longitude == null) return;
    map.flyTo([alert.latitude, alert.longitude], 15, { animate: true });
    toast.info("📍 Zoom sur la panne sélectionnée");
  }, [alert, map]);
  return null;
}

// --- MapView ---
const MapView = forwardRef(({
  reports = [],
  solidaires = [],
  alerts = [],
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
  cancelReport,
  currentUserUid,
  showHelperList,
  setShowHelperList,
}, ref) => {
  const mapRef = useRef(null);
  useImperativeHandle(ref, () => ({
    recenter: () => { if (mapRef.current && userPosition) mapRef.current.setView(userPosition, 15); }
  }));

  const [currentReport, setCurrentReport] = useState(null);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);

  if (!Array.isArray(userPosition) || userPosition.length < 2)
    return <div>📍 Localisation en cours...</div>;

  // --- Filtrage sécurisé des solidaires ---
  const filteredSolidaires = solidaires
    .filter(s => s.latitude != null && s.longitude != null)
    .map((s) => {
      const isOffline = !s.online;
      const alreadyAlerted = activeReport ? alerts.some(a => a.toUid === s.uid && a.reportId === activeReport.id) : false;
      const materielArray = Array.isArray(s.materiel) ? s.materiel : [s.materiel].filter(Boolean);
      const isRelevant = activeReport?.nature && materielArray.some(m => m.toLowerCase().includes(activeReport.nature.toLowerCase()));

      let status = "available";
      if (isOffline) status = "offline";
      else if (alreadyAlerted) status = "alerted";
      else if (isRelevant) status = "relevant";

      return { ...s, status, alreadyAlerted };
    });

  // --- Calcul distances ---
  const distances = {};
  filteredSolidaires.forEach(s => {
    distances[s.uid] = Number(getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude)) || 0;
  });

  return (
    <>
      {/* Modals */}
      <AcceptModal
        isOpen={isAcceptOpen}
        onClose={() => setIsAcceptOpen(false)}
        alerte={currentReport}
        onConfirm={(report) => {
          setCurrentReport(report);
          setIsAcceptOpen(false);
          setIsInProgressOpen(true);
        }}
      />
      <InProgressModal
        isOpen={isInProgressOpen}
        onClose={() => setIsInProgressOpen(false)}
        report={currentReport}
        solidaire={solidaires.find(s => s.uid === currentUserUid)}
        onComplete={() => {}}
      />

      {/* Modal helpers */}
      {showHelperList && (
        <ModalHelperList
          helpers={filteredSolidaires}
          userPosition={userPosition}
          activeReport={activeReport}
          setShowHelperList={setShowHelperList}
          onAlert={(helper) => {
            if (!activeReport) return toast.error("Vous devez avoir un signalement actif !");
            onAlertUser(helper);
            setShowHelperList(false);
          }}
          onClose={() => setShowHelperList(false)}
        />
      )}

      <MapContainer
        center={userPosition}
        zoom={13}
        style={{ height: "100%", width: "100%", zIndex: 0 }}
        ref={mapRef}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <SetViewOnUser position={userPosition} />
        {activeReport && <FlyToLocation alert={activeReport} />}

        {/* Utilisateur */}
        <Marker position={userPosition} icon={currentUserIcon}>
          <Popup>🙋‍♂️ Vous êtes ici</Popup>
        </Marker>

        {/* Reports */}
        {reports.filter(r => r.latitude != null && r.longitude != null).map(report => (
          <Marker
            key={report.id}
            position={[report.latitude, report.longitude]}
            icon={reportIcon}
            eventHandlers={{ click: () => onReportClick(report) }}
          >
            <Popup>
              <strong>⚠️ Panne :</strong> {report.nature} <br />
              {report.ownerUid === currentUserUid && (
                <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>
              )}
            </Popup>
          </Marker>
        ))}

        {/* Solidaires */}
        {filteredSolidaires.map(s => {
          const alertForSolidaire = activeReport
            ? alerts.find(a => a.reportId === activeReport.id && a.toUid === s.uid)
            : null;
          let status = s.status;
          if (activeReport?.helperUid === s.uid) {
            if (activeReport.helperConfirmed) status = "busy";
            else if (alertForSolidaire) status = "alerted";
          }
          const alertCount = alerts.filter(a => a.toUid === s.uid).length;
          const distance = distances[s.uid] || 0;

          return (
            <Marker
              key={s.uid}
              position={[s.latitude, s.longitude]}
              icon={getSolidaireIconWithBadge(status, alertCount)}
            >
              <Popup>
                <strong>👤 {s.name}</strong> <br />
                Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
                📏 Distance : {distance.toFixed(1)} km <br />
                {status === "available" && "✅ Disponible"}
                {status === "offline" && "⚪ Indisponible"}
                {status === "alerted" && "⏳ En attente de réponse"}
                {status === "busy" && "⏳ Aide en cours"}
                {status === "available" && s.uid !== currentUserUid && (
                  <button
                    onClick={() => {
                      onAlertUser(s);
                      toast.info(`⚡ Alerte envoyée à ${s.name}`);
                    }}
                  >
                    ⚡ Alerter
                  </button>
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
});

export default MapView;
