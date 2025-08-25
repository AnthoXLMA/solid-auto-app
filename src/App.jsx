import React, { useState, useEffect } from "react";
import './index.css';
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
import Chat from "./Chat";
import AlertsListener from "./AlertsListener";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
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
  query,
  where,
} from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import useReportsListener from "./useReportsListener";
import PayButton from "./PayButton";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);

  const userReports = useReportsListener(user);

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "solidaires", currentUser.uid));
        setUser(userDoc.exists() ? { ...currentUser, ...userDoc.data() } : currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // LogOut
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.info("👋 Déconnexion réussie !");
    } catch (err) {
      console.error("Erreur lors de la déconnexion :", err);
      toast.error("❌ Impossible de se déconnecter.");
    }
  };

  // Géolocalisation
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
        () => setCurrentPosition([43.4923, -1.4746])
      );
    }
  }, []);

  // Création de solidaires fictifs
  useEffect(() => {
    const createFakeUsers = async () => {
      const fakeUsers = [
        { uid: "fake1", name: "Alice", latitude: 43.493, longitude: -1.475, materiel: "batterie" },
        { uid: "fake2", name: "Bob", latitude: 43.491, longitude: -1.476, materiel: "pneu" },
      ];
      for (const u of fakeUsers) {
        try {
          const userDoc = await getDoc(doc(db, "solidaires", u.uid));
          if (!userDoc.exists()) await setDoc(doc(db, "solidaires", u.uid), u);
        } catch (err) {
          console.error("Erreur création user fictif :", err);
        }
      }
    };
    createFakeUsers();
  }, []);

  // Écoute alertes pour l'utilisateur
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAlerts(data);
    });
    return () => unsub();
  }, [user]);

  // Écoute solidaires en temps réel
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      setSolidaires(snapshot.docs.map((doc) => doc.data()));
    });
    return () => unsub();
  }, []);

  // Mise à jour position
  useEffect(() => {
    if (user && currentPosition) {
      setDoc(
        doc(db, "solidaires", user.uid),
        {
          uid: user.uid,
          name: user.email,
          latitude: currentPosition[0],
          longitude: currentPosition[1],
          materiel: user.materiel || "batterie",
        },
        { merge: true }
      );
    }
  }, [currentPosition, user]);

  // Écoute globale des reports
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "reports"), (snapshot) => {
      const allReports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setReports(allReports);

      if (activeReport) {
        const updated = allReports.find((r) => r.id === activeReport.id);
        if (updated) setActiveReport(updated);
      }
    });
    return () => unsub();
  }, [user, activeReport?.id]);

  // Création de report
  const handleNewReport = async (newReport) => {
    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, "reports"), {
        ...newReport,
        ownerUid: user.uid,
        helperUid: null,
        notified: false,
        status: "en attente",
        timestamp: serverTimestamp(),
      });
      setActiveReport({ ...newReport, id: docRef.id });
      toast.success("✅ Demande de panne créée !");
    } catch (err) {
      console.error("Erreur création report :", err);
      toast.error("⚠️ Impossible de créer le rapport.");
    }
  };

  // Filtrage solidaires pour report actif
  const filteredSolidaires = solidaires
    .filter((s) => s.uid !== user?.uid) // 🔥 exclure le Current User
    .map((s) => {
      if (!activeReport) return { ...s, status: "normal" };
      const pendingAlertsCount = alerts.filter((a) => a.toUid === s.uid).length;
      const alreadyAlerted = s.alerts?.includes(activeReport.id) || false;
      const isRelevant =
        s.materiel &&
        activeReport.nature &&
        s.materiel.toLowerCase().includes(activeReport.nature.toLowerCase());

      let status = "irrelevant";
      if (alreadyAlerted) status = "alerted";
      else if (isRelevant) status = "relevant";
      if (pendingAlertsCount > 0) status = "alerted";
      return { ...s, alreadyAlerted, pendingAlertsCount, status };
    });


  // Alerter un solidaire
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
        prev ? { ...prev, status: "aide en cours", helperUid: solidaire.uid } : prev
      );

      toast.success(`✅ Alerte envoyée à ${solidaire.name} !`);
    } catch (err) {
      console.error("Erreur alerte :", err);
      toast.error("⚠️ Impossible d'envoyer l'alerte.");
    }
  };

    // Annuler un report (seulement si c'est le sien)
  const cancelReport = async (reportId) => {
    if (!user) return;
    try {
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (!reportDoc.exists()) {
        toast.error("⚠️ Report introuvable.");
        return;
      }

      const reportData = reportDoc.data();
      // 🔒 Vérification : seul le ownerUid peut annuler
      if (reportData.ownerUid !== user.uid) {
        toast.error("⛔ Vous ne pouvez pas annuler la panne d'un autre utilisateur !");
        return;
      }

      await deleteDoc(doc(db, "reports", reportId));
      setActiveReport(null);
      toast.info("🗑️ Votre demande de panne a été annulée !");
    } catch (err) {
      console.error("Erreur lors de l'annulation :", err);
      toast.error("❌ Impossible d'annuler la panne pour le moment.");
    }
  };

  // Si pas d'utilisateur connecté, afficher Auth
  if (!user) return <Auth />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow">
        <h1 className="text-xl font-bold">Bienvenue {user.email}</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
        >
          Se déconnecter
        </button>
      </header>

<main className="flex-1 relative bg-gray-100">
  {/* Carte occupe tout */}
  <div className="absolute inset-0">
    <MapView
      reports={reports}
      solidaires={filteredSolidaires}
      alerts={alerts}
      userPosition={currentPosition}
      onPositionChange={setCurrentPosition}
      onReportClick={setActiveReport}
      onAlertUser={onAlertUser}
      activeReport={activeReport}
      selectedAlert={selectedAlert}
      cancelReport={cancelReport}
    />
  </div>
    {/* Bouton + SUR la carte */}
    <button
      onClick={() => setShowReportForm(true)}
      className="absolute bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700
                 rounded-full shadow-2xl flex items-center justify-center
                 text-white text-4xl font-bold border-4 border-white
                 transition-transform transform hover:scale-110 z-50"
    >
      +
    </button>

  {/* Bottom sheet : Report Form */}
  {showReportForm && (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70%] overflow-y-auto z-50">
      <ReportForm
        userPosition={currentPosition}
        onNewReport={(r) => {
          handleNewReport(r);
          setShowReportForm(false);
        }}
      />
      <button
        onClick={() => setShowReportForm(false)}
        className="mt-2 w-full bg-gray-200 py-2 rounded-lg"
      >
        Fermer
      </button>
    </div>
  )}

  {/* Bottom sheet : Alertes */}
  {user && alerts.length > 0 && (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-300 p-4 rounded-t-2xl shadow-lg z-40">
      <AlertsListener
        user={user}
        setSelectedAlert={setSelectedAlert}
        userPosition={currentPosition}
      />
    </div>
  )}

  {/* Paiement : affiché comme une card flottante */}
  {activeReport && activeReport.helperUid && activeReport.status === "aide en cours" && user?.uid === activeReport.ownerUid && (
    <div className="fixed bottom-24 left-4 right-4 bg-white rounded-xl shadow-lg p-4 z-40">
      <PayButton report={activeReport} />
    </div>
  )}
</main>



      <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">
        © {new Date().getFullYear()} U-Boto - Tous droits réservés
      </footer>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
