import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat";
import AlertsListener from "./AlertsListener";

import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  addDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  // 🔹 Surveille l’état d’auth
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
        if (user) {
          await deleteDoc(doc(db, "solidaires", user.uid));
        }
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 🔹 Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setCurrentPosition([43.4923, -1.4746])
      );
    }
  }, []);

  const createFakeUsers = async () => {
  const fakeUsers = [
    { uid: "fake-1", name: "Paul", latitude: 48.8566, longitude: 2.3522, materiel: "batterie" },
    { uid: "fake-2", name: "Sophie", latitude: 45.7640, longitude: 4.8357, materiel: "pneu" },
    { uid: "fake-3", name: "Karim", latitude: 43.6045, longitude: 1.4440, materiel: "carburant" },
    { uid: "fake-4", name: "Julie", latitude: 43.2965, longitude: 5.3698, materiel: "batterie" },
    { uid: "fake-5", name: "Marc", latitude: 49.2583, longitude: 4.0317, materiel: "pneu" },
  ];

  for (const u of fakeUsers) {
    const docRef = doc(db, "solidaires", u.uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      await setDoc(docRef, u);
    }
  }
  toast.success("✅ Utilisateurs fictifs ajoutés !");
};


const handleNewReport = async (newReport) => {
  try {
    const docRef = await addDoc(collection(db, "reports"), {
      ...newReport,
      status: "en attente",
      timestamp: serverTimestamp(),
    });

    const reportWithId = { ...newReport, id: docRef.id };
    setReports([...reports, reportWithId]);
    setActiveReport(reportWithId);
  } catch (err) {
    console.error("Erreur création report :", err);
    alert("⚠️ Impossible de créer le rapport.");
  }
};


  // 🔹 Écoute temps réel des solidaires
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      setSolidaires(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, []);

  // 🔹 Mise à jour de la position
  useEffect(() => {
    if (user && currentPosition) {
      setDoc(
        doc(db, "solidaires", user.uid),
        {
          uid: user.uid,
          name: user.email,
          latitude: currentPosition[0],
          longitude: currentPosition[1],
          materiel: user.materiel || "pinces",
        },
        { merge: true }
      );
    }
  }, [currentPosition, user]);

  // 🔹 Filtrage des solidaires : ne montrer que ceux pouvant répondre à la panne active
const filteredSolidaires = activeReport
  ? solidaires.filter(
      (s) =>
        s.materiel &&
        activeReport.nature &&
        s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase())
    )
  : [];

  // 🔹 Fonction pour alerter un solidaire
  const onAlertUser = async (solidaire) => {
    if (!activeReport || !user) return;
    try {
      await addDoc(collection(db, "alertes"), {
        fromUid: user.uid,
        toUid: solidaire.uid,
        reportId: activeReport.id,
        status: "envoyée",
        timestamp: serverTimestamp(),
      });

      await updateDoc(doc(db, "reports", activeReport.id), {
        status: "aide en cours",
        helperUid: solidaire.uid,
      });

      toast.success(`✅ Alerte envoyée à ${solidaire.name} !`);
    } catch (err) {
      console.error("Erreur alerte :", err);
      toast.error("⚠️ Impossible d'envoyer l'alerte.");
    }
  };

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
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />

      {user && <AlertsListener user={user} />}

      {!user ? (
        <Auth setUser={setUser} />
      ) : (
        <>
          <h2>Bienvenue {user.email}</h2>

          <button onClick={createFakeUsers}>👤 Ajouter utilisateurs fictifs</button>

          <MapView
  reports={reports}
  solidaires={filteredSolidaires}
  userPosition={currentPosition}
  onPositionChange={setCurrentPosition}
  onReportClick={setActiveReport}
  onAlertUser={onAlertUser}
  activeReport={activeReport}
/>



          <ReportForm userPosition={currentPosition} onNewReport={handleNewReport} />

          {activeReport && <Chat report={activeReport} user={user} />}
        </>
      )}
    </div>
  );
}
