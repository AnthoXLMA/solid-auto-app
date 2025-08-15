import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat"; // composant chat par panne

import { db } from "./firebase"; // ton firebase.js
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);

  const [reports, setReports] = useState([
    {
      id: "report-1",
      latitude: 43.4925,
      longitude: -1.4740,
      nature: "batterie",
      message: "Plus de batterie, cherche des pinces",
      status: "en-attente",
      address: "Rue des Fleurs, Bayonne",
    },
  ]);

  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  // 🔹 Geolocalisation automatique
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCurrentPosition([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn(
            "Impossible de récupérer la position, fallback à Bayonne",
            err
          );
          setCurrentPosition([43.4923, -1.4746]); // fallback Bayonne
        }
      );
    } else {
      console.warn("Géolocalisation non supportée par ce navigateur");
      setCurrentPosition([43.4923, -1.4746]); // fallback Bayonne
    }
  }, []);

  const handleAddSolidaire = (solidaire) => {
    setSolidaires([...solidaires, solidaire]);
  };

  const handleNewReport = (newReport) => {
    setReports([
      ...reports,
      { ...newReport, id: `report-${reports.length + 1}` },
    ]);
  };

  // 🔹 Écoute en temps réel de tous les utilisateurs connectés
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      const users = snapshot.docs.map((doc) => doc.data());
      setSolidaires(users);
    });
    return () => unsub();
  }, []);

  // 🔹 Mise à jour de la position de l'utilisateur dans Firestore
  useEffect(() => {
    if (user && currentPosition) {
      const userDoc = doc(db, "solidaires", user.uid);
      setDoc(userDoc, {
        uid: user.uid,
        name: user.email,
        latitude: currentPosition[0],
        longitude: currentPosition[1],
        materiel: user.materiel || "pinces", // ou récupérer depuis ton formulaire
      });
    }
  }, [currentPosition, user]);

  // 🔹 Supprimer l'utilisateur de Firestore à la déconnexion
  useEffect(() => {
    return () => {
      if (user) {
        deleteDoc(doc(db, "solidaires", user.uid));
      }
    };
  }, [user]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
        padding: "20px",
      }}
    >
      {!user ? (
        <Auth setUser={setUser} onBecomeSolidaire={handleAddSolidaire} />
      ) : (
        <>
          <h2>Bienvenue {user.email}</h2>

          {/* Carte */}
          <MapView
            reports={reports}
            solidaires={solidaires} // 🔹 tous les utilisateurs connectés
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
            onReportClick={setActiveReport}
          />

          {/* Formulaire de signalement */}
          <ReportForm
            userPosition={currentPosition}
            onNewReport={handleNewReport}
          />

          {/* Chat pour la panne active */}
          {activeReport && <Chat report={activeReport} user={user} />}
        </>
      )}
    </div>
  );
}
