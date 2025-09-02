import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc, collection, updateDoc, query, where, getDocs } from "firebase/firestore";
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
        iconAnchor: [18, 18]
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
    iconAnchor: [18, 18]
  });
};

const alertHelper = (helper) => { toast.info(`⚡ Alerte envoyée à ${helper.name}`); };

// === Composants utilitaires ===
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

function HelperBanner({ activeReport, solidaires, userPosition }) {
  if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return null;
  const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
  if (!helper) return null;
  const distanceRaw = helper.latitude && helper.longitude ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude) : null;
  const distance = typeof distanceRaw === "number" ? distanceRaw : Number(distanceRaw) || 0;

  return (
    <div style={{
      position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
      background: "#e6f7ff", border: "1px solid #91d5ff",
      padding: "8px 16px", borderRadius: "12px", zIndex: 1000,
      fontWeight: "bold", display: "flex", flexDirection: "column", alignItems: "center"
    }}>
      🚗 {helper.name} est en route pour vous aider
      {distance && <span>📏 Distance restante : {distance.toFixed(1)} km</span>}
    </div>
  );
}

// === Composant principal MapView ===
const MapView = forwardRef(({ reports = [], solidaires = [], alerts = [], userPosition, onReportClick, onAlertUser, activeReport, selectedAlert, cancelReport, currentUserUid, showHelperList, setShowHelperList }, ref) => {
  const mapRef = useRef(null);
  useImperativeHandle(ref, () => ({
    recenter: () => { if (mapRef.current && userPosition) mapRef.current.setView(userPosition, 15); }
  }));

  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [distanceToHelper, setDistanceToHelper] = useState(null);
  const [currentUser, setCurrentUser] = useState(solidaires.find(s => s.uid === currentUserUid) || null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const filteredSolidairesWithCoords = findHelpers(solidaires, activeReport, alerts, currentUserUid).slice(0, 10);
  const [reviewsMap, setReviewsMap] = useState({});

  // --- Fetch avis ---
  useEffect(() => {
    const fetchReviews = async () => {
      const map = {};
      await Promise.all(filteredSolidairesWithCoords.map(async (s) => {
        const q = query(collection(db, "reviews"), where("toUid", "==", s.uid));
        const snap = await getDocs(q);
        const avis = snap.docs.map(d => d.data());
        const averageNote = avis.length ? avis.reduce((sum, r) => sum + r.note, 0) / avis.length : 0;
        map[s.uid] = { averageNote, count: avis.length };
      }));
      setReviewsMap(map);
    };
    fetchReviews();
  }, [filteredSolidairesWithCoords]);

  // --- Suivi temps réel du report actif ---
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
          if (data.helperConfirmed && data.status === "aide en cours") setCurrentReport({ ...activeReport, ...data });
        }
      }
    });
    return () => unsub();
  }, [activeReport, cancelReport, onReportClick]);

  // --- Calcul distance helper ---
  useEffect(() => {
    if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return;
    const interval = setInterval(() => {
      const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
      if (!helper || typeof helper.latitude !== "number" || typeof helper.longitude !== "number") return;
      const dist = getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude);
      setDistanceToHelper(typeof dist === "number" ? dist : Number(dist) || 0);
    }, 5000);
    return () => clearInterval(interval);
  }, [activeReport, solidaires, userPosition]);

  // --- Notification sinistré ---
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

  if (!userPosition || userPosition.length < 2) return <div>📍 Localisation en cours...</div>;

  let alertLocation = null;
  if (selectedAlert) {
    const report = reports.find((r) => r.id === selectedAlert.reportId);
    if (report && typeof report.latitude === "number" && typeof report.longitude === "number") alertLocation = { latitude: report.latitude, longitude: report.longitude };
  }

  const isSinistre = currentUser?.role !== "solidaire";

  console.log("userPosition", userPosition);
  console.log("PaymentBanner props:", currentReport, solidaires.find(s => s.uid === currentReport.helperUid), currentUserUid);
  return (
    <>

      {/* --- Modals et banners au-dessus --- */}
      <AcceptModal isOpen={isAcceptOpen} onClose={() => setIsAcceptOpen(false)} alerte={currentReport} onConfirm={(report) => { setCurrentReport(report); setIsAcceptOpen(false); }} />
      {isSinistre && currentReport?.helperConfirmed && currentReport.helperUid && (
        <ActiveRepairModal
          report={currentReport}
          solidaire={filteredSolidairesWithCoords.find(s => s.uid === currentReport.helperUid) || null}
          userPosition={userPosition}
          onComplete={() => setCurrentReport(null)}
        />
      )}
      {!isSinistre && currentReport?.helperConfirmed &&
        <InProgressModal
          isOpen={true}
          onClose={() => {}}
          report={currentReport}
          solidaire={currentUser}
          userPosition={userPosition}
          setPaymentStatus={setPaymentStatus}
          onComplete={() => setCurrentReport(null)}
        />}
      {showHelperList &&
        <ModalHelperList
          helpers={filteredSolidairesWithCoords}
          userPosition={userPosition}
          activeReport={activeReport}
          onAlert={(helper) => { if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !"); alertHelper(helper); setShowHelperList(false); }}
          onClose={() => setShowHelperList(false)}
        />}
        {isSinistre && currentReport?.helperConfirmed && currentReport.helperUid && (
          <PaymentBanner
            report={currentReport}
            solidaire={solidaires.find(s => s.uid === currentReport.helperUid) || null}
            currentUser={{ uid: currentUserUid }}
            isSinistre={true}
          />
        )}
      {/* --- Map en arrière-plan --- */}
      <div className="relative w-full h-full z-0">
        <MapContainer center={userPosition} zoom={13} style={{ height: "100%", width: "100%" }} ref={mapRef} scrollWheelZoom>
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <SetViewOnUser position={userPosition} />
          {alertLocation && <FlyToLocation alert={alertLocation} />}
          {isSinistre && currentReport?.helperConfirmed && <HelperBanner activeReport={currentReport} solidaires={filteredSolidairesWithCoords} userPosition={userPosition} />}

          <Marker position={userPosition} icon={currentUserIcon}><Popup>🙋‍♂️ Vous êtes ici</Popup></Marker>

          {reports.map(report => (
            <Marker key={report.id} position={[report.latitude, report.longitude]} icon={reportIcon} eventHandlers={{ click: () => onReportClick(report) }}>
              <Popup>
                <strong>⚠️ Panne :</strong> {report.nature} <br />
                {report.ownerUid === currentUserUid && <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>}
              </Popup>
            </Marker>
          ))}

          {filteredSolidairesWithCoords.map(s => {
            let status = "available";
            const isOffline = !s.online;
            const alertForSolidaire = currentReport ? alerts.find(a => a.reportId === currentReport.id && a.toUid === s.uid) : null;
            if (isOffline) status = "offline";
            else if (currentReport?.helperUid === s.uid) {
              if (currentReport.helperConfirmed && currentReport.status === "aide en cours") status = "busy";
              else if (!currentReport.helperConfirmed && alertForSolidaire) status = "alerted";
            }

            let distanceRaw = getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude);
            const distance = typeof distanceRaw === "number" ? distanceRaw : Number(distanceRaw) || 0;
            const alertCount = alerts.filter(a => a.toUid === s.uid).length;

            return (
              <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={getSolidaireIconWithBadge(status, alertCount)}>
                <Popup>
                  <strong>👤 {s.name}</strong> <br />
                  {`⭐ Note moyenne : ${reviewsMap[s.uid]?.averageNote?.toFixed(1) || "Pas encore de note"} (${reviewsMap[s.uid]?.count || 0} avis)`} <br />
                  Rôle : {s.role?.replace(/_/g, " ") || "Non spécifié"} <br />
                  Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
                  📏 Distance : {distance.toFixed(1)} km
                  {status === "available" && "✅ Disponible"}
                  {status === "offline" && "⚪ Indisponible"}
                  {status === "alerted" && "⏳ En attente de réponse"}
                  {status === "busy" && "⏳ Aide en cours"}
                  {status === "available" && s.uid !== currentUserUid &&
                    <button onClick={() => { onAlertUser(s); toast.info(`⚡ Alerte envoyée à ${s.name}`); }}>⚡ Alerter</button>}
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </>
  );
});

export default MapView;
