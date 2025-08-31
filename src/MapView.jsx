import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc, collection, updateDoc, query, where, getDocs } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase";
import PaymentBanner from "./PaymentBanner";
// import PayButton from "./PayButton";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import { getDistanceKm } from "./utils/distance";
import ModalHelperList from "./ModalHelperList";
import { findHelpers } from "./utils/matching";
import { Typography } from "@mui/material";

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

const alertHelper = (helper) => {
  toast.info(`⚡ Alerte envoyée à ${helper.name}`);
};

// === Recentrage sur utilisateur ===
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
  return null;
}

// === Zoom sur alerte ===
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

// === Composant principal MapView ===
const MapView = forwardRef(({
  reports = [],
  solidaires = [],
  alerts = [],
  userPosition,
  onReportClick,
  onAlertUser,
  activeReport,
  selectedAlert,
  cancelReport,
  currentUserUid,
  showHelperList,
  setShowHelperList
}, ref) => {
  const mapRef = useRef(null);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (mapRef.current && userPosition) mapRef.current.setView(userPosition, 15);
    },
  }));

  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [distanceToHelper, setDistanceToHelper] = useState(null);
  const [currentUser, setCurrentUser] = useState(solidaires.find(s => s.uid === currentUserUid) || null);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Filter helpers avec coords valides
  const filteredSolidairesWithCoords = findHelpers(solidaires, activeReport, alerts, currentUserUid);
  const availableHelpers = filteredSolidairesWithCoords.slice(0, 10);

  // Gestion des avis et notes
  const [reviewsMap, setReviewsMap] = useState({}); // { [solidaireUid]: { averageNote: 4.5, count: 3 } }
  useEffect(() => {
    const fetchReviews = async () => {
      const map = {};
      await Promise.all(
        filteredSolidairesWithCoords.map(async (s) => {
          const q = query(collection(db, "reviews"), where("toUid", "==", s.uid));
          const snap = await getDocs(q);
          const avis = snap.docs.map(d => d.data());
          const averageNote = avis.length > 0
            ? avis.reduce((sum, r) => sum + r.note, 0) / avis.length
            : 0;
          map[s.uid] = { averageNote, count: avis.length };
        })
      );
      setReviewsMap(map);
    };
    fetchReviews();
  }, [filteredSolidairesWithCoords]);

  // Suivi temps réel du report actif
  useEffect(() => {
    if (!activeReport) return;
    const reportRef = doc(db, "reports", activeReport.id);
    const unsub = onSnapshot(reportRef, (docSnap) => {
      if (!docSnap.exists()) cancelReport(activeReport.id);
      else {
        const data = docSnap.data();
        if (data.status !== activeReport.status || data.helperConfirmed !== activeReport.helperConfirmed) {
          onReportClick({ ...activeReport, status: data.status, helperUid: data.helperUid, helperConfirmed: data.helperConfirmed });
          if (data.helperConfirmed && !activeReport.helperConfirmed) toast.info(`🚗 ${data.helperName} est en route pour vous aider`);
          if (data.helperConfirmed && data.status === "aide en cours") {
            setCurrentReport({ ...activeReport, ...data });
            setIsInProgressOpen(true);
          }
        }
      }
    });
    return () => unsub();
  }, [activeReport, cancelReport, onReportClick]);

  // Calcul distance en temps réel
  useEffect(() => {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return;
    const interval = setInterval(() => {
      const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
      if (!helper || typeof helper.latitude !== "number" || typeof helper.longitude !== "number") return;
      const dist = getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude);
      setDistanceToHelper(dist);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeReport, solidaires, userPosition]);

  // Toast pour notifications
  useEffect(() => {
    if (!currentUserUid) return;
    const q = collection(db, "reports");
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.ownerUid === currentUserUid && data.notificationForOwner) {
          toast.info(data.notificationForOwner);
          updateDoc(doc(db, "reports", docSnap.id), { notificationForOwner: null });
        }
      });
    });
    return () => unsub();
  }, [currentUserUid]);

  if (!userPosition || userPosition.length < 2 || userPosition[0] == null || userPosition[1] == null)
    return <div>📍 Localisation en cours...</div>;

  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find((r) => r.id === selectedAlert.reportId);
    if (report && typeof report.latitude === "number" && typeof report.longitude === "number") {
      alertLocation = { latitude: report.latitude, longitude: report.longitude };
    }
  }

  function HelperBanner({ activeReport, solidaires, userPosition }) {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return null;
    const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
    if (!helper) return null;
    const distance = helper.latitude && helper.longitude
      ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
      : null;
    return (
      <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "#e6f7ff", border: "1px solid #91d5ff", padding: "8px 16px", borderRadius: "12px", zIndex: 1000, fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center" }}>
        🚗 {helper.name} est en route pour vous aider
        {distance && <span>📏 Distance restante : {distance} km</span>}
      </div>
    );
  }

  const canPay = activeReport?.helperConfirmed && activeReport?.status === "aide en cours" && activeReport?.frais > 0;

  return (
    <>
      <AcceptModal
        isOpen={isAcceptOpen}
        onClose={() => setIsAcceptOpen(false)}
        alerte={currentReport}
        onConfirm={(report) => { setCurrentReport(report); setIsAcceptOpen(false); setIsInProgressOpen(true); }}
      />
      <InProgressModal
        isOpen={isInProgressOpen}
        onClose={() => setIsInProgressOpen(false)}
        report={currentReport}
        solidaire={currentUser}
        onComplete={() => {}}
      />
      {showHelperList && (
        <ModalHelperList
          helpers={availableHelpers}
          userPosition={userPosition}
          activeReport={activeReport}
          onAlert={(helper) => { if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !"); alertHelper(helper); setShowHelperList(false); }}
          onClose={() => setShowHelperList(false)}
        />
      )}
      <MapContainer center={userPosition} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }} ref={mapRef} scrollWheelZoom>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <SetViewOnUser position={userPosition} />
        {alertLocation && <FlyToLocation alert={alertLocation} />}
        {activeReport?.helperConfirmed && activeReport.helperUid && (
          <HelperBanner activeReport={activeReport} solidaires={filteredSolidairesWithCoords} userPosition={userPosition} />
        )}
        {activeReport?.helperConfirmed &&
         activeReport.helperUid &&
         activeReport.frais > 0 &&
         currentUser && (
          <PaymentBanner
            report={activeReport}
            solidaire={
              filteredSolidairesWithCoords.find(s => s.uid === activeReport.helperUid) ||
              { uid: activeReport.helperUid, name: activeReport.helperName, stripeAccountId: activeReport.solidaireStripeId }
            }
            currentUser={currentUser}
            isSinistre={currentUser.uid !== activeReport.helperUid}
            paymentStatus={paymentStatus}
            setPaymentStatus={setPaymentStatus}
            style={{
              position: "absolute",
              top: 10,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 1000,
            }}
          />
        )}
      )}

{/*        {canPay && <PayButton report={activeReport} />}*/}


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
          let status = "available";
          const isOffline = !s.online;
          const alertForSolidaire = activeReport
            ? alerts.find((a) => a.reportId === activeReport.id && a.toUid === s.uid)
            : null;

          if (isOffline) status = "offline";
          else if (activeReport?.helperUid === s.uid) {
            if (activeReport.helperConfirmed && activeReport.status === "aide en cours") status = "busy";
            else if (!activeReport.helperConfirmed && alertForSolidaire) status = "alerted";
          }

          const distance = getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude);
          const alertCount = alerts.filter((a) => a.toUid === s.uid).length;

          return (
            <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={getSolidaireIconWithBadge(status, alertCount)}>
              <Popup>
                <strong>👤 {s.name}</strong> <br />
                <Typography>
                  ⭐ Note moyenne : {reviewsMap[s.uid]?.averageNote?.toFixed(1) || "Pas encore de note"} ({reviewsMap[s.uid]?.count || 0} avis)
                </Typography>
                <Typography>
                  🏷 Rôle : {s.role ? s.role.replace(/_/g, " ") : "Non spécifié"}
                </Typography>
                Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
                📏 Distance : {distance} km <br />
                {status === "available" && "✅ Disponible"}
                {status === "offline" && "⚪ Indisponible"}
                {status === "alerted" && "⏳ En attente de réponse"}
                {status === "busy" && "⏳ Aide en cours"}
                {status === "available" && s.uid !== currentUserUid && (
                  <button onClick={() => { onAlertUser(s); toast.info(`⚡ Alerte envoyée à ${s.name}`); }}>
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
