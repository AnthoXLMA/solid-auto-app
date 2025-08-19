import React, { useState, useEffect } from "react";
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat";
import AlertsListener from "./AlertsListener";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc, deleteDoc, getDoc, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useReportsListener from "./useReportsListener";
import UserReports from "./UserReports";


export default function App() {
  // 🔹 States
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  // 🔹 Hook pour récupérer les reports de l'utilisateur
  const userReports = useReportsListener(user);

  // 🔹 Surveille l’état d’auth (une seule fois)
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

  // 🔹 Création de solidaires fictifs (une seule fois)
  useEffect(() => {
    const createFakeUsers = async () => {
      const fakeUsers = [
        { uid: "fake1", name: "Alice", latitude: 43.493, longitude: -1.475, materiel: "batterie" },
        { uid: "fake2", name: "Bob", latitude: 43.491, longitude: -1.476, materiel: "pneu" },
        { uid: "fake3", name: "Charlie", latitude: 43.492, longitude: -1.474, materiel: "carburant" },
        { uid: "fake4", name: "David", latitude: 48.8566, longitude: 2.3522, materiel: "huile" },
        { uid: "fake5", name: "Emma", latitude: 45.7640, longitude: 4.8357, materiel: "clé" },
        { uid: "fake6", name: "Fiona", latitude: 43.2965, longitude: 5.3698, materiel: "tournevis" },
        { uid: "fake7", name: "George", latitude: 43.6047, longitude: 1.4442, materiel: "pinces" },
        { uid: "fake8", name: "Hannah", latitude: 43.7102, longitude: 7.2620, materiel: "batterie" },
        { uid: "fake9", name: "Ian", latitude: 47.2184, longitude: -1.5536, materiel: "pneu" },
        { uid: "fake10", name: "Julia", latitude: 48.5734, longitude: 7.7521, materiel: "carburant" },
        { uid: "fake11", name: "Kevin", latitude: 43.6108, longitude: 3.8767, materiel: "huile" },
        { uid: "fake12", name: "Laura", latitude: 48.1173, longitude: -1.6778, materiel: "clé" },
        { uid: "fake13", name: "Mike", latitude: 45.1885, longitude: 5.7245, materiel: "tournevis" },
        { uid: "fake14", name: "Nina", latitude: 47.3220, longitude: 5.0415, materiel: "pinces" },
        { uid: "fake15", name: "Oscar", latitude: 45.7772, longitude: 3.0870, materiel: "batterie" },
      ];

      for (const u of fakeUsers) {
        try {
          const userDoc = await getDoc(doc(db, "solidaires", u.uid));
          if (!userDoc.exists()) {
            await setDoc(doc(db, "solidaires", u.uid), u);
          }
        } catch (err) {
          console.error("Erreur création user fictif :", err);
        }
      }
    };

    createFakeUsers();
  }, []);

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

  // 🔹 Création de report
  const handleNewReport = async (newReport) => {
    try {
      const docRef = await addDoc(collection(db, "reports"), {
        ...newReport,
        ownerUid: user.uid,   // ✅ qui a créé la demande
        helperUid: null,      // ✅ personne encore assignée
        notified: false,      // ✅ servira pour ton toast
        status: "en attente",
        timestamp: serverTimestamp(),
      });

      const reportWithId = { ...newReport, id: docRef.id };
      setReports((prev) => [...prev, reportWithId]);
      setActiveReport(reportWithId);
    } catch (err) {
      console.error("Erreur création report :", err);
      toast.error("⚠️ Impossible de créer le rapport.");
    }
  };

  // 🔹 Filtrage des solidaires pour le rapport actif
  const filteredSolidaires = solidaires.map((s) => {
    if (!activeReport) return { ...s, status: "normal" };

    const alreadyAlerted = s.alerts?.includes(activeReport.id) || false;
    const isRelevant =
      s.materiel &&
      activeReport.nature &&
      s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase());

    return {
      ...s,
      alreadyAlerted,
      status: alreadyAlerted ? "alerted" : isRelevant ? "relevant" : "irrelevant",
    };
  });

  // 🔹 Alerter un solidaire
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

      setActiveReport((prev) =>
        prev && prev.id === activeReport.id
          ? { ...prev, status: "aide en cours", helperUid: solidaire.uid }
          : prev
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === activeReport.id
            ? { ...r, status: "aide en cours", helperUid: solidaire.uid }
            : r
        )
      );

      toast.success(`✅ Alerte envoyée à ${solidaire.name} !`);
    } catch (err) {
      console.error("Erreur alerte :", err);
      toast.error("⚠️ Impossible d'envoyer l'alerte.");
    }
  };

  const [selectedAlert, setSelectedAlert] = useState(null);

// reportId = ID de la panne à annuler
const cancelReport = async (reportId) => {
  try {
    // Supprimer la panne dans Firestore
    await deleteDoc(doc(db, "reports", reportId));

    // Réinitialiser l'état local pour réafficher la carte sans ce marker
    setReports(prevReports => prevReports.filter(r => r.id !== reportId));

    // Réinitialiser éventuellement l'état des solidaires actifs
    setActiveReport(null);

    window.alert("🗑️ Votre demande de panne a été annulée !");
  } catch (err) {
    console.error("Erreur lors de l'annulation :", err);
    window.alert("❌ Impossible d'annuler la panne pour le moment.");
  }
};

// 🔹 Surveille le report actif en temps réel
useEffect(() => {
  if (!activeReport) return;

  const unsub = onSnapshot(doc(db, "reports", activeReport.id), (docSnap) => {
    if (!docSnap.exists()) {
      toast.info("🗑️ La demande de dépannage a été annulée ou rejetée.");
      setActiveReport(null);  // 🔹 reset l'activeReport pour la MapView
      setReports(prev => prev.filter(r => r.id !== activeReport.id));
    } else {
      const data = docSnap.data();
      setActiveReport(prev => ({ ...prev, ...data })); // 🔹 met à jour status/helperUid
      setReports(prev =>
        prev.map(r => (r.id === data.id ? { ...r, ...data } : r))
      );
    }
  });

  return () => unsub();
}, [activeReport?.id]);

  return (
<div className="min-h-screen flex flex-col">

  {/* Header */}
  <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow">
    <h1 className="text-xl font-bold">Bienvenue {user?.email}</h1>
  </header>

  {/* Contenu principal */}
  <main className="flex flex-1 p-4 gap-4 bg-gray-50">
    {/* Colonne gauche */}
    <div className="flex-1 flex flex-col gap-4">
      <div className="flex-1 bg-white rounded-xl shadow p-2">
        <MapView
          reports={reports}
          solidaires={filteredSolidaires}
          userPosition={currentPosition}
          onPositionChange={setCurrentPosition}
          onReportClick={setActiveReport}
          onAlertUser={onAlertUser}
          activeReport={activeReport}
          selectedAlert={selectedAlert}
          cancelReport={cancelReport}
        />
      </div>

      <div className="bg-white rounded-xl shadow p-4">
        <ReportForm userPosition={currentPosition} onNewReport={handleNewReport} />
      </div>
    </div>
  </main>

  {/* Footer */}
  <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">
    © {new Date().getFullYear()} U-boto - Tous droits réservés
  </footer>
</div>

  );
}
