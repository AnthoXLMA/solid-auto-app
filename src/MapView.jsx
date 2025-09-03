// --- MapView.jsx ---
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
             <span class="pulse-badge">${pendingAlertsCount}</span>
           </div>`,
    iconSize: [35, 35],
    iconAnchor: [18, 18],
  });
};

// --- Helper notifications ---
const alertHelper = (helper) => {
  toast.info(`⚡ Alerte envoyée à ${helper.name}`);
};

// --- Utilitaires Map ---
function SetViewOnUser({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, 15);
  }, [position, map]);
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
  if (!activeReport?.helperUid || !activeReport.helperConfirmed) return null;
  const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
  if (!helper) return null;

  const distanceRaw =
    helper.latitude != null &&
    helper.longitude != null &&
    Array.isArray(userPosition) &&
    userPosition.length === 2
      ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
      : 0;

  const distance = Number(distanceRaw) || 0;

  return (
    <div
      style={{
        position: "absolute",
        top: 10,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#e6f7ff",
        border: "1px solid #91d5ff",
        padding: "8px 16px",
        borderRadius: "12px",
        zIndex: 1000,
        fontWeight: "bold",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      🚗 {helper.name} est en route pour vous aider
      {distance ? <span>📏 Distance restante : {distance.toFixed(1)} km</span> : null}
    </div>
  );
}

// --- MapView principal ---
const MapView = forwardRef(
  (
    {
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
      setShowHelperList,
    },
    ref
  ) => {
    const mapRef = useRef(null);
    useImperativeHandle(ref, () => ({
      recenter: () => {
        if (mapRef.current && userPosition) mapRef.current.setView(userPosition, 15);
      },
    }));

    const [isAcceptOpen, setIsAcceptOpen] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [distanceToHelper, setDistanceToHelper] = useState(0);
    const [currentUser, setCurrentUser] = useState(
      solidaires.find((s) => s.uid === currentUserUid) || null
    );
    const [paymentStatus, setPaymentStatus] = useState(null);

    const filteredSolidairesWithCoords = findHelpers(
      solidaires,
      activeReport,
      alerts,
      currentUserUid
    ).slice(0, 10);

    const [reviewsMap, setReviewsMap] = useState({});
    const [showInProgress, setShowInProgress] = useState(false);

    // --- Fetch reviews ---
    useEffect(() => {
      const fetchReviews = async () => {
        const map = {};
        await Promise.all(
          filteredSolidairesWithCoords.map(async (s) => {
            const q = query(collection(db, "reviews"), where("toUid", "==", s.uid));
            const snap = await getDocs(q);
            const avis = snap.docs.map((d) => d.data());
            const averageNote = avis.length
              ? avis.reduce((sum, r) => sum + r.note, 0) / avis.length
              : 0;
            map[s.uid] = { averageNote, count: avis.length };
          })
        );
        setReviewsMap(map);
      };
      fetchReviews();
    }, [filteredSolidairesWithCoords]);

    // --- Suivi report actif ---
    useEffect(() => {
      if (!activeReport) return;
      const reportRef = doc(db, "reports", activeReport.id);
      const unsub = onSnapshot(reportRef, (docSnap) => {
        if (!docSnap.exists()) return cancelReport(activeReport.id);
        const data = docSnap.data();
        setCurrentReport({ ...activeReport, ...data });

        if (data.status === "attente séquestre" && data.helperConfirmed && !showInProgress) {
          setShowInProgress(true);
        }

        if (data.notificationForOwner) {
          toast.info(data.notificationForOwner);
          updateDoc(doc(db, "reports", docSnap.id), { notificationForOwner: null });
        }
      });
      return () => unsub();
    }, [activeReport, cancelReport, showInProgress]);

    // --- Calcul distance helper ---
    useEffect(() => {
      if (!currentReport?.helperUid || !currentReport.helperConfirmed) return;
      const interval = setInterval(() => {
        const helper = solidaires.find((s) => s.uid === currentReport.helperUid);
        if (!helper || typeof helper.latitude !== "number" || typeof helper.longitude !== "number") return;
        const dist = Number(
          getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
        ) || 0;
        setDistanceToHelper(dist);
      }, 5000);
      return () => clearInterval(interval);
    }, [currentReport, solidaires, userPosition]);

    if (!Array.isArray(userPosition) || userPosition.length < 2)
      return <div>📍 Localisation en cours...</div>;

    const alertLocation = selectedAlert
      ? reports.find((r) => r.id === selectedAlert.reportId)
      : null;

    const isSinistre = currentUser?.role !== "solidaire";
    const helperForPayment =
      currentReport?.helperUid && solidaires.find((s) => s.uid === currentReport.helperUid);

    return (
      <>
        {/* Modals */}
        <AcceptModal
          isOpen={isAcceptOpen && !!currentReport?.id && !!currentReport?.helperUid}
          onClose={() => setIsAcceptOpen(false)}
          alerte={currentReport}
          onConfirm={(report) => {
            setCurrentReport(report);
            setIsAcceptOpen(false);
          }}
        />
        {isSinistre && currentReport?.helperConfirmed && currentReport.helperUid && (
          <PaymentBanner
            report={currentReport}
            solidaire={helperForPayment}
            currentUser={{ uid: currentUserUid }}
            isSinistre
          />
        )}
        {isSinistre && currentReport?.helperConfirmed && currentReport.helperUid && (
          <ActiveRepairModal
            report={currentReport}
            solidaire={filteredSolidairesWithCoords.find((s) => s.uid === currentReport.helperUid) || null}
            userPosition={userPosition}
            onComplete={() => setCurrentReport(null)}
          />
        )}
        {!isSinistre && showInProgress && currentReport?.helperConfirmed && currentReport.helperUid && (
          <InProgressModal
            isOpen
            onClose={() => setShowInProgress(false)}
            report={currentReport}
            solidaire={currentUser}
            userPosition={userPosition}
            setPaymentStatus={setPaymentStatus}
            onComplete={() => setCurrentReport(null)}
          />
        )}
        {showHelperList && (
          <ModalHelperList
            helpers={filteredSolidairesWithCoords}
            userPosition={userPosition}
            activeReport={activeReport}
            onAlert={(helper) => {
              if (!activeReport)
                return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !");
              alertHelper(helper);
              setShowHelperList(false);
            }}
            setShowHelperList={setShowHelperList}
            onClose={() => setShowHelperList(false)}
          />
        )}

        {/* Map */}
        <div className="relative w-full h-full z-0">
          <MapContainer center={userPosition} zoom={13} style={{ height: "100%", width: "100%" }} ref={mapRef} scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <SetViewOnUser position={userPosition} />
            {alertLocation && <FlyToLocation alert={alertLocation} />}
            {isSinistre && currentReport?.helperConfirmed && (
              <HelperBanner activeReport={currentReport} solidaires={filteredSolidairesWithCoords} userPosition={userPosition} />
            )}

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
              const alertForSolidaire = currentReport && alerts
                ? alerts.find((a) => a.reportId === currentReport.id && a.toUid === s.uid)
                : null;

              let status = "available";
              if (isOffline) status = "offline";
              else if (currentReport?.helperUid === s.uid) {
                if (currentReport.helperConfirmed && currentReport.status === "aide en cours") status = "busy";
                else if (!currentReport.helperConfirmed && alertForSolidaire) status = "alerted";
              }

              const distance = Number(
                s.latitude != null && s.longitude != null && Array.isArray(userPosition) && userPosition.length === 2
                  ? getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude)
                  : 0
              ) || 0;

              const alertCount = alerts?.filter((a) => a.toUid === s.uid).length || 0;

              return (
                <Marker key={s.uid} position={[s.latitude, s.longitude]} icon={getSolidaireIconWithBadge(status, alertCount)}>
                  <Popup>
                    <strong>👤 {s.name}</strong> <br />
                    {`⭐ Note moyenne : ${reviewsMap[s.uid]?.averageNote?.toFixed(1) || "Pas encore de note"} (${reviewsMap[s.uid]?.count || 0} avis)`} <br />
                    Rôle : {s.role?.replace(/_/g, " ") || "Non spécifié"} <br />
                    Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
                    📏 Distance : {distance.toFixed(1)} km <br />
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
        </div>
      </>
    );
  }
);

export default MapView;
