import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { onSnapshot, doc } from "firebase/firestore";
import { toast } from "react-toastify";
import { db } from "./firebase";
import PaymentBanner from "./PaymentBanner";
import PayButton from "./PayButton";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import { getDistanceKm } from "./utils/distance";
import ModalHelperList from "./ModalHelperList";
import { findHelpers } from "./utils/matching";
import { FaUser } from "react-icons/fa";
import { collection, updateDoc } from "firebase/firestore";

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

// === Composant principal MapView avec forwardRef ===
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

  // Toast pour refus de demande de dépannage
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

  // ✅ Filter helpers avec coords valides
  const filteredSolidairesWithCoords = findHelpers(solidaires, activeReport, alerts, currentUserUid);

  const availableHelpers = filteredSolidairesWithCoords.slice(0, 10);

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
        {activeReport?.helperConfirmed && activeReport.helperUid && activeReport.frais > 0 && (
          <PaymentBanner report={activeReport} solidaire={filteredSolidairesWithCoords.find(s => s.uid === activeReport.helperUid)} />
        )}
        {canPay && <PayButton report={activeReport} />}

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



// import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from "react";
// import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";
// import { onSnapshot, doc } from "firebase/firestore";
// import { toast } from "react-toastify";
// import { db } from "./firebase";
// import PaymentBanner from "./PaymentBanner";
// import PayButton from "./PayButton";
// import AcceptModal from "./AcceptModal";
// import InProgressModal from "./InProgressModal";
// import { getDistanceKm } from "./utils/distance";
// import ModalHelperList from "./ModalHelperList";
// import { MATERIEL_OPTIONS } from "./constants/materiel";
// import { findHelpers } from "./utils/matching";

// // === Icônes ===
// const currentUserIcon = new L.Icon({
//   iconUrl: "https://img.icons8.com/?size=100&id=fsoiqMUp0O4v&format=png&color=000000",
//   iconSize: [60, 60],
// });

// const reportIcon = new L.Icon({
//   iconUrl: "https://img.icons8.com/?size=100&id=U12vJQsF1INo&format=png&color=000000",
//   iconSize: [45, 45],
// });

// const getSolidaireIconWithBadge = (status, pendingAlertsCount) => {
//   let baseIconUrl;
//   switch (status) {
//     case "alerted":
//       baseIconUrl = "https://img.icons8.com/?size=100&id=I24lanX6Nq71&format=png&color=000000";
//       break;
//     case "busy":
//       baseIconUrl = "https://img.icons8.com/?size=100&id=59817&format=png&color=000000";
//       break;
//     case "offline":
//       baseIconUrl = "https://img.icons8.com/?size=100&id=107162&format=png&color=888888";
//       break;
//     default:
//       baseIconUrl = "https://img.icons8.com/?size=100&id=hwOJ5x33ywg6&format=png&color=000000";
//   }

//   if (!pendingAlertsCount) return new L.Icon({ iconUrl: baseIconUrl, iconSize: [45, 45] });

//   return L.divIcon({
//     className: "solidaire-badge-icon",
//     html: `<div style="position: relative; display: inline-block;">
//             <img src="${baseIconUrl}" style="width:35px;height:35px;"/>
//             <span class="pulse-badge">${pendingAlertsCount}</span>
//            </div>`,
//     iconSize: [35, 35],
//     iconAnchor: [18, 18],
//   });
// };

// // === Utilitaire distance (Haversine) ===
// // function getDistanceKm(lat1, lon1, lat2, lon2) {
// //   const R = 6371;
// //   const dLat = ((lat2 - lat1) * Math.PI) / 180;
// //   const dLon = ((lon2 - lon1) * Math.PI) / 180;
// //   const a =
// //     Math.sin(dLat / 2) ** 2 +
// //     Math.cos((lat1 * Math.PI) / 180) *
// //       Math.cos((lat2 * Math.PI) / 180) *
// //       Math.sin(dLon / 2) ** 2;
// //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
// //   return (R * c).toFixed(1);
// // }

// const alertHelper = (helper) => {
//   // Ici tu mets ce que tu veux faire quand un solidaire est alerté
//   console.log("⚡ Alerte envoyée à", helper.name);

//   // Exemple basique : afficher une notification
//   toast.info(`⚡ Alerte envoyée à ${helper.name}`);

//   // Plus tard, tu pourras déclencher un enregistrement dans Firestore
//   // pour notifier le solidaire directement.
// };


// // Recentrage sur utilisateur
// function SetViewOnUser({ position }) {
//   const map = useMap();
//   useEffect(() => {
//     if (position) map.setView(position, 15);
//   }, [position, map]);
//   return null;
// }

// // Zoom sur alerte
// function FlyToLocation({ alert }) {
//   const map = useMap();
//   useEffect(() => {
//     if (!alert) return;
//     const { latitude, longitude } = alert;
//     if (typeof latitude !== "number" || typeof longitude !== "number") return;
//     map.flyTo([latitude, longitude], 15, { animate: true });
//     toast.info("📍 Zoom sur la panne sélectionnée");
//   }, [alert, map]);
//   return null;
// }

// // === Composant principal MapView avec forwardRef ===
// const MapView = forwardRef(({
//   reports = [],
//   solidaires = [],
//   alerts = [],
//   userPosition,
//   onReportClick,
//   onAlertUser,
//   activeReport,
//   selectedAlert,
//   cancelReport,
//   currentUserUid,
//   showHelperList,
//   setShowHelperList
// }, ref) => {
//   const mapRef = useRef(null);

//   useImperativeHandle(ref, () => ({
//     recenter: () => {
//       if (mapRef.current && userPosition) {
//         mapRef.current.setView(userPosition, 15);
//       }
//     },
//   }));

//   // === États pour modals ===
//   const [isAcceptOpen, setIsAcceptOpen] = useState(false);
//   const [isInProgressOpen, setIsInProgressOpen] = useState(false);
//   const [currentReport, setCurrentReport] = useState(null);
//   const [distanceToHelper, setDistanceToHelper] = useState(null);
//   const [currentUser, setCurrentUser] = useState(solidaires.find(s => s.uid === currentUserUid) || null);

//   // const availableHelpers = solidaires
//   // .filter(s => s.materiel?.includes(activeReport?.materiel) && s.uid !== currentUserUid)
//   // .sort(
//   //   (a, b) =>
//   //     getDistanceKm(userPosition[0], userPosition[1], a.latitude, a.longitude) -
//   //     getDistanceKm(userPosition[0], userPosition[1], b.latitude, b.longitude)
//   // );


//   // Suivi temps réel du report actif
//   useEffect(() => {
//     if (!activeReport) return;
//     const reportRef = doc(db, "reports", activeReport.id);
//     const unsub = onSnapshot(reportRef, (docSnap) => {
//       if (!docSnap.exists()) {
//         cancelReport(activeReport.id);
//       } else {
//         const data = docSnap.data();
//         if (
//           data.status !== activeReport.status ||
//           data.helperConfirmed !== activeReport.helperConfirmed
//         ) {
//           onReportClick({
//             ...activeReport,
//             status: data.status,
//             helperUid: data.helperUid,
//             helperConfirmed: data.helperConfirmed,
//           });

//           // Toast pour solidaire en route
//           if (data.helperConfirmed && !activeReport.helperConfirmed) {
//             toast.info(`🚗 ${data.helperName} est en route pour vous aider`);
//           }

//           // Ouvrir InProgressModal uniquement si l'aide a commencé
//           if (data.helperConfirmed && data.status === "aide en cours") {
//             setCurrentReport({ ...activeReport, ...data });
//             setIsInProgressOpen(true);
//           }
//         }
//       }
//     });
//     return () => unsub();
//   }, [activeReport, cancelReport, onReportClick]);

//   // Calcul distance en temps réel
//   useEffect(() => {
//     if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return;

//     const interval = setInterval(() => {
//       const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
//       if (!helper || !helper.latitude || !helper.longitude) return;
//       const dist = getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude);
//       setDistanceToHelper(dist);
//     }, 5000);

//     return () => clearInterval(interval);
//   }, [activeReport, solidaires, userPosition]);

//   if (!userPosition || userPosition.length < 2 || userPosition[0] == null || userPosition[1] == null)
//     return <div>📍 Localisation en cours...</div>;

//   let alertLocation = null;
//   if (selectedAlert) {
//     const report = reports.find((r) => r.id === selectedAlert.reportId);
//     if (report && report.latitude && report.longitude) {
//       alertLocation = { latitude: report.latitude, longitude: report.longitude };
//     }
//   }

//   const filteredSolidaires = findHelpers(solidaires, activeReport, alerts, currentUserUid);
//   // ✅ Ne garder que ceux avec des coordonnées valides
//   const filteredSolidairesWithCoords = filteredSolidaires.filter(
//     (s) => typeof s.latitude === "number" && typeof s.longitude === "number"
//   );

//   const availableHelpers = filteredSolidaires.slice(0, 10); // les 10 premiers helpers, sans filtre

// // Bandeau helper confirmé uniquement
//   function HelperBanner({ activeReport, solidaires, userPosition }) {
//     if (!activeReport || !activeReport.helperUid || !activeReport.helperConfirmed) return null;
//     const helper = solidaires.find((s) => s.uid === activeReport.helperUid);
//     if (!helper) return null;

//     const distance =
//       helper.latitude && helper.longitude
//         ? getDistanceKm(userPosition[0], userPosition[1], helper.latitude, helper.longitude)
//         : null;

//     return (
//       <div
//         style={{
//           position: "absolute",
//           top: 10,
//           left: "50%",
//           transform: "translateX(-50%)",
//           background: "#e6f7ff",
//           border: "1px solid #91d5ff",
//           padding: "8px 16px",
//           borderRadius: "12px",
//           zIndex: 1000,
//           fontWeight: "bold",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//         }}
//       >
//         🚗 {helper.name} est en route pour vous aider
//         {distance && <span>📏 Distance restante : {distance} km</span>}
//       </div>
//     );
//   }

//   const canPay = activeReport?.helperConfirmed && activeReport?.status === "aide en cours" && activeReport?.frais > 0;

//   return (
//     <>
//       {/* Modals */}
//       <AcceptModal
//         isOpen={isAcceptOpen}
//         onClose={() => setIsAcceptOpen(false)}
//         alerte={currentReport}
//         onConfirm={(report, montant, fraisAnnules) => {
//           setCurrentReport(report);
//           setIsAcceptOpen(false);
//           setIsInProgressOpen(true);
//         }}
//       />
//       <InProgressModal
//         isOpen={isInProgressOpen}
//         onClose={() => setIsInProgressOpen(false)}
//         report={currentReport}
//         solidaire={currentUser}
//         onComplete={() => {}}
//       />

//       {showHelperList && (
//         <ModalHelperList
//           helpers={availableHelpers}
//           userPosition={userPosition}
//           activeReport={activeReport} // <-- on passe le report actif
//           onAlert={(helper) => {
//             if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !");
//             alertHelper(helper);
//             setShowHelperList(false);
//           }}
//           onClose={() => setShowHelperList(false)}
//         />
//       )}

//       {/* Map */}
//       <MapContainer
//         center={userPosition}
//         zoom={13}
//         style={{ height: "100%", width: "100%", zIndex: 0 }}
//         ref={mapRef}
//         scrollWheelZoom
//       >
//         <TileLayer
//           attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
//           url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//         />

//         <SetViewOnUser position={userPosition} />
//         {alertLocation && <FlyToLocation alert={alertLocation} />}
//         {activeReport?.helperConfirmed && activeReport.helperUid && (
//           <HelperBanner activeReport={activeReport} solidaires={solidaires} userPosition={userPosition} />
//         )}

//         {activeReport?.helperConfirmed && activeReport.helperUid && activeReport.frais > 0 && (
//           <PaymentBanner
//             report={activeReport}
//             solidaire={solidaires.find(s => s.uid === activeReport.helperUid)}
//           />
//         )}

//         {canPay && <PayButton report={activeReport} />}

//         {/* Utilisateur */}
//         <Marker position={userPosition} icon={currentUserIcon}>
//           <Popup>🙋‍♂️ Vous êtes ici</Popup>
//         </Marker>

//         {/* Reports */}
//         {reports.map((report) => (
//           <Marker
//             key={report.id}
//             position={[report.latitude, report.longitude]}
//             icon={reportIcon}
//             eventHandlers={{ click: () => onReportClick(report) }}
//           >
//             <Popup>
//               <strong>⚠️ Panne :</strong> {report.nature} <br />
//               {report.ownerUid === currentUserUid && (
//                 <button onClick={() => cancelReport(report.id)}>❌ Annuler</button>
//               )}
//             </Popup>
//           </Marker>
//         ))}

//         {/* Solidaires */}
//         {filteredSolidaires.map((s) => {
//           let status = "available";
//           const isOffline = !s.online;
//           const alertForSolidaire = activeReport
//             ? alerts.find((a) => a.reportId === activeReport.id && a.toUid === s.uid)
//             : null;

//           if (isOffline) status = "offline";
//           else if (activeReport?.helperUid === s.uid) {
//             if (activeReport.helperConfirmed && activeReport.status === "aide en cours") status = "busy";
//             else if (!activeReport.helperConfirmed && alertForSolidaire) status = "alerted";
//           }

//           const distance = getDistanceKm(userPosition[0], userPosition[1], s.latitude, s.longitude);

//           // 👉 ici tu ajoutes le comptage
//           const alertCount = alerts.filter((a) => a.toUid === s.uid).length;

//           return (
//             <Marker
//               key={s.uid}
//               position={[s.latitude, s.longitude]}
//               icon={getSolidaireIconWithBadge(status, alertCount)} // 👈 tu passes alertCount
//             >
//               <Popup>
//                 <strong>👤 {s.name}</strong> <br />
//                 Matériel : {Array.isArray(s.materiel) ? s.materiel.join(", ") : s.materiel || "Non spécifié"} <br />
//                 📏 Distance : {distance} km <br />
//                 {status === "available" && "✅ Disponible"}
//                 {status === "offline" && "⚪ Indisponible"}
//                 {status === "alerted" && "⏳ En attente de réponse"}
//                 {status === "busy" && "⏳ Aide en cours"}
//                 {status === "available" && s.uid !== currentUserUid && (
//                   <button
//                     onClick={() => {
//                       onAlertUser(s);
//                       toast.info(`⚡ Alerte envoyée à ${s.name}`);
//                     }}
//                   >
//                     ⚡ Alerter
//                   </button>
//                 )}
//               </Popup>
//             </Marker>
//           );
//         })}
//       </MapContainer>
//     </>
//   );
// });
// console.log({ PaymentBanner, AcceptModal, InProgressModal });

// export default MapView;
