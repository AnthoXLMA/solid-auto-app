import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// 🔹 Icônes custom
const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
  iconSize: [30, 30],
});

const otherUserIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=AmvvpYN8jrzG&format=png&color=000000",
  iconSize: [25, 25],
});

const reportIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
  iconSize: [25, 25],
});

const solidaireIcon = new L.Icon({
  iconUrl: "https://img.icons8.com/?size=100&id=AmvvpYN8jrzG&format=png&color=000000",
  iconSize: [30, 30],
});

const solidaireAlertedIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
  iconSize: [28, 28],
});

const solidaireHighlightIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
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

  const getIconByStatus = (status) => {
    switch (status) {
      case "relevant":
        return solidaireHighlightIcon;
      case "alerted":
        return solidaireAlertedIcon;
      case "irrelevant":
        return solidaireIcon;
      default:
        return solidaireIcon;
    }
  };

  // 🔹 Filtrer les solidaires qui peuvent répondre à la panne
  const filteredSolidaires = activeReport
    ? solidaires.filter(
        (s) =>
          s.materiel &&
          activeReport.nature &&
          s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
      )
    : [];

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
          </Popup>
        </Marker>
      ))}

      {/* Marqueurs des utilisateurs avant panne */}
      {!activeReport &&
        solidaires.map((s) => (
          <Marker
            key={s.uid}
            position={[s.latitude, s.longitude]}
            icon={otherUserIcon}
          >
            <Popup>
              <strong>👤 {s.name}</strong> <br />
              Matériel : {s.materiel}
            </Popup>
          </Marker>
        ))}

      {/* Marqueurs des solidaires filtrés après panne */}
      {activeReport &&
        filteredSolidaires.map((s) => {
          let status = "relevant";
          if (activeReport.helperUid === s.uid) status = "alerted";

          return (
            <Marker
              key={s.uid}
              position={[s.latitude, s.longitude]}
              icon={getIconByStatus(status)}
            >
              <Popup>
                <strong>👤 {s.name}</strong> <br />
                Matériel : {s.materiel} <br />
                {status === "alerted" ? (
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


// Code pour n'avoir qu'un seul utilisateur ssur la carte avant la panne;
// import React from "react";
// import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
// import "leaflet/dist/leaflet.css";
// import L from "leaflet";

// // 🔹 Icônes
// const userIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
//   iconSize: [30, 30],
// });

// const reportIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/1828/1828843.png",
//   iconSize: [25, 25],
// });

// const solidaireIcon = new L.Icon({
//   iconUrl: "https://img.icons8.com/?size=100&id=AmvvpYN8jrzG&format=png&color=000000",
//   iconSize: [30, 30],
// });

// const solidaireAlertedIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
//   iconSize: [28, 28],
// });

// const solidaireHighlightIcon = new L.Icon({
//   iconUrl: "https://cdn-icons-png.flaticon.com/512/190/190411.png",
//   iconSize: [30, 30],
// });

// export default function MapView({
//   reports,
//   solidaires,
//   userPosition,
//   onReportClick,
//   onAlertUser,
//   activeReport,
//   currentUserUid, // uid de l'utilisateur connecté
// }) {
//   if (!userPosition) return <div>📍 Localisation en cours...</div>;

//   const getIconByStatus = (status) => {
//     switch (status) {
//       case "relevant":
//         return solidaireHighlightIcon;
//       case "alerted":
//         return solidaireAlertedIcon;
//       default:
//         return solidaireIcon;
//     }
//   };

//   // 🔹 Filtrer solidaires capables de répondre, exclure l'utilisateur connecté
//   const filteredSolidaires =
//     activeReport
//       ? solidaires.filter(
//           (s) =>
//             s.uid !== currentUserUid &&
//             s.materiel &&
//             activeReport.nature &&
//             s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
//         )
//       : [];

//   return (
//     <MapContainer
//       center={userPosition}
//       zoom={6}
//       style={{ height: "500px", width: "100%" }}
//       scrollWheelZoom={true}
//     >
//       <TileLayer
//         attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />

//       {/* Marqueur de l'utilisateur connecté */}
//       <Marker position={userPosition} icon={userIcon}>
//         <Popup>🙋‍♂️ Vous êtes ici</Popup>
//       </Marker>

//       {/* Marqueurs des reports */}
//       {reports.map((report) => (
//         <Marker
//           key={report.id}
//           position={[report.latitude, report.longitude]}
//           icon={reportIcon}
//           eventHandlers={{ click: () => onReportClick(report) }}
//         >
//           <Popup>
//             <strong>⚠️ Panne :</strong> {report.nature} <br />
//             <button
//               style={{ marginTop: "5px", cursor: "pointer" }}
//               onClick={() => onReportClick(report)}
//             >
//               🔍 Voir détails
//             </button>
//           </Popup>
//         </Marker>
//       ))}

//       {/* Marqueurs des solidaires filtrés */}
//       {activeReport &&
//         filteredSolidaires.map((s) => {
//           const status = activeReport.helperUid === s.uid ? "alerted" : "relevant";

//           return (
//             <Marker
//               key={s.uid}
//               position={[s.latitude, s.longitude]}
//               icon={getIconByStatus(status)}
//             >
//               <Popup>
//                 <strong>👤 {s.name}</strong> <br />
//                 Matériel : {s.materiel} <br />
//                 {status === "alerted" ? (
//                   <span style={{ color: "orange", fontWeight: "bold" }}>
//                     📞 Déjà alerté – en attente
//                   </span>
//                 ) : (
//                   <button
//                     style={{ marginTop: "5px", cursor: "pointer" }}
//                     onClick={() => onAlertUser(s)}
//                   >
//                     ⚡ Alerter
//                   </button>
//                 )}
//               </Popup>
//             </Marker>
//           );
//         })}
//     </MapContainer>
//   );
// }

