import React, { useState, useEffect } from "react";
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

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);

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
          materiel: user.materiel || "pinces",
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

      <main className="flex flex-1 p-4 gap-4 bg-gray-50">
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-xl shadow p-2">
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

          <div className="bg-white rounded-xl shadow p-4">
            <ReportForm userPosition={currentPosition} onNewReport={handleNewReport} />
          </div>

          {user && (
            <div className="bg-white rounded-xl shadow p-4">
              <AlertsListener
                user={user}
                setSelectedAlert={setSelectedAlert}
                userPosition={currentPosition}
              />
            </div>
          )}

          {user && (
            <div className="bg-white rounded-xl shadow p-4">
              <Chat user={user} activeReport={activeReport} />
            </div>
          )}
        </div>
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">
        © {new Date().getFullYear()} U-boto - Tous droits réservés
      </footer>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
