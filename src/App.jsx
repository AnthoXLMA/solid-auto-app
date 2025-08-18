import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat";

import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  // 🔹 Surveille l’état d’auth pour ne pas perdre la session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "solidaires", currentUser.uid));
        if (userDoc.exists()) {
          setUser({ ...currentUser, ...userDoc.data() });
        } else {
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // 🔹 Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setCurrentPosition([43.4923, -1.4746])
      );
    }
  }, []);

  // 🔹 Fonction pour créer des utilisateurs fictifs
  const createFakeUsers = async () => {
  const fakeUsers = [
  { uid: "fake-1", name: "Paul", latitude: 48.8566, longitude: 2.3522, materiel: "batterie" },     // Paris
  { uid: "fake-2", name: "Sophie", latitude: 45.7640, longitude: 4.8357, materiel: "pneu" },      // Lyon
  { uid: "fake-3", name: "Karim", latitude: 43.6045, longitude: 1.4440, materiel: "carburant" },  // Toulouse
  { uid: "fake-4", name: "Julie", latitude: 43.2965, longitude: 5.3698, materiel: "batterie" },   // Marseille
  { uid: "fake-5", name: "Marc", latitude: 49.2583, longitude: 4.0317, materiel: "pneu" },       // Reims
  { uid: "fake-6", name: "Emma", latitude: 48.5734, longitude: 7.7521, materiel: "batterie" },    // Strasbourg
  { uid: "fake-7", name: "Léa", latitude: 50.6292, longitude: 3.0573, materiel: "carburant" },   // Lille
  { uid: "fake-8", name: "Lucas", latitude: 44.8378, longitude: -0.5792, materiel: "pneu" },     // Bordeaux
  { uid: "fake-9", name: "Nora", latitude: 47.2184, longitude: -1.5536, materiel: "batterie" },  // Nantes
  { uid: "fake-10", name: "Thomas", latitude: 45.1885, longitude: 5.7245, materiel: "pneu" },    // Grenoble
  { uid: "fake-11", name: "Alice", latitude: 43.6108, longitude: 3.8767, materiel: "carburant" },// Montpellier
  { uid: "fake-12", name: "Julien", latitude: 48.6921, longitude: 6.1844, materiel: "batterie" },// Nancy
  { uid: "fake-13", name: "Chloé", latitude: 43.7102, longitude: 7.2620, materiel: "pneu" },    // Nice
  { uid: "fake-14", name: "Antoine", latitude: 46.6034, longitude: 1.8883, materiel: "carburant" },// Centre France
];

  for (const u of fakeUsers) {
    await setDoc(doc(db, "solidaires", u.uid), u);
  }

  console.log("✅ Utilisateurs fictifs ajoutés !");
};


  // 🔹 Création d’une nouvelle panne et activation directe
  const handleNewReport = (newReport) => {
    const reportWithId = { ...newReport, id: `report-${reports.length + 1}` };
    setReports([...reports, reportWithId]);
    setActiveReport(reportWithId); // <- nouvelle ligne : active la panne dès sa création
  };

  // 🔹 Écoute temps réel des solidaires
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      setSolidaires(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, []);

  // 🔹 Mise à jour de la position dans Firestore
  useEffect(() => {
    if (user && currentPosition) {
      setDoc(doc(db, "solidaires", user.uid), {
        uid: user.uid,
        name: user.email,
        latitude: currentPosition[0],
        longitude: currentPosition[1],
        materiel: user.materiel || "pinces",
      });
    }
  }, [currentPosition, user]);

  // 🔹 Supprimer utilisateur Firestore à la déconnexion
  useEffect(() => {
    return () => {
      if (user) deleteDoc(doc(db, "solidaires", user.uid));
    };
  }, [user]);

  // 🔹 Filtrage des solidaires selon le matériel requis par la panne active
  const filteredSolidaires = activeReport
    ? solidaires.filter(
        (s) =>
          s.materiel &&
          activeReport.nature &&
          s.materiel.toLowerCase() === activeReport.nature.toLowerCase()
      )
    : [];

  console.log("Panne active :", activeReport);
  console.log("Solidaires filtrés :", filteredSolidaires);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "20px" }}>
      {!user ? (
        <Auth setUser={setUser} />
      ) : (
        <>
          <h2>Bienvenue {user.email}</h2>

          {/* Bouton pour ajouter utilisateurs fictifs */}
          <button onClick={createFakeUsers}>👤 Ajouter utilisateurs fictifs</button>

          {/* Carte */}
          <MapView
            reports={reports}
            solidaires={filteredSolidaires}
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
            onReportClick={setActiveReport}
          />

          {/* Formulaire de signalement */}
          <ReportForm userPosition={currentPosition} onNewReport={handleNewReport} />

          {/* Chat pour la panne active */}
          {activeReport && <Chat report={activeReport} user={user} />}
        </>
      )}
    </div>
  );
}
