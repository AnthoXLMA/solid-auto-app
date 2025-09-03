// src/App.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import './index.css';
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
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
import { useNavigate } from "react-router-dom";
import { FaCommentDots, FaBook, FaTachometerAlt, FaMapMarkedAlt } from "react-icons/fa";
import ProfileForm from "./ProfileForm";
import AlertHistory from "./AlertHistory";
import Dashboard from "./Dashboard";
import UserReports from "./UserReports";
import Chat from "./Chat";
import ModalHelperList from "./ModalHelperList";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState([46.959095, 4.858485]);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showHelperList, setShowHelperList] = useState(false);
  const [showPanneModal, setShowPanneModal] = useState(false);
  const [page, setPage] = useState("map");
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [showChat, setShowChat] = useState(false);

  const userReports = useReportsListener(user);
  const mapRef = useRef(null);
  const navigate = useNavigate();

  // -------------------- Auth --------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userRef = doc(db, "solidaires", currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser({ uid: currentUser.uid, email: currentUser.email, ...userSnap.data() });
          } else {
            const newUser = {
              uid: currentUser.uid,
              email: currentUser.email,
              username: currentUser.displayName || currentUser.email.split("@")[0],
              materiel: "batterie",
              online: true,
            };
            await setDoc(userRef, newUser);
            setUser(newUser);
          }
        } catch (err) {
          console.error("Erreur récupération user :", err);
          setUser(currentUser);
        }
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // -------------------- Géolocalisation --------------------
  useEffect(() => {
    if (!navigator.geolocation) {
      toast.warning("⚠️ Géolocalisation non supportée par votre navigateur.");
      return;
    }
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition([pos.coords.latitude, pos.coords.longitude]),
      (err) => {
        console.warn("Erreur géoloc :", err.message);
        toast.warning("⚠️ Impossible de récupérer votre position. Position par défaut utilisée.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // -------------------- Online / Offline --------------------
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "solidaires", user.uid);
    updateDoc(userRef, { online: true }).catch(() => {});
    const handleBeforeUnload = () => updateDoc(userRef, { online: false }).catch(() => {});
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      updateDoc(userRef, { online: false }).catch(() => {});
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  // -------------------- Solidaires --------------------
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
      const allSolidaires = snapshot.docs.map((doc) => doc.data() || {});
      setSolidaires(allSolidaires);
      setOnlineUsers(allSolidaires.filter((s) => s.online).length);
    });
    return () => unsub();
  }, []);

  // -------------------- Reports --------------------
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
    const createdReport = { ...newReport, id: docRef.id }; // <-- important
    setActiveReport(createdReport);
    setShowHelperList(true);
    toast.success("✅ Demande de panne créée !");
    return createdReport; // <-- retourne l'objet pour ReportForm
  } catch (err) {
    console.error("Erreur création report :", err);
    toast.error("⚠️ Impossible de créer le rapport.");
    return null;
  }
};


  // -------------------- Alerts --------------------
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [user]);

  // -------------------- Navigation --------------------
  const navigateTo = (path) => {
    navigate(`/${path}`);
    setPage(path);
  };

  // -------------------- Filter helpers --------------------
  const filteredSolidaires = useMemo(() => {
    if (!solidaires || !Array.isArray(solidaires)) return [];
    return solidaires
      .filter((s) => s.uid !== user?.uid)
      .map((s) => {
        const pendingAlertsCount = alerts.filter((a) => a.toUid === s.uid).length;
        const alreadyAlerted = s.alerts?.includes(activeReport?.id) || false;
        const materielArray = Array.isArray(s.materiel) ? s.materiel : [s.materiel].filter(Boolean);
        const isRelevant = activeReport?.nature && materielArray.some((m) => m.toLowerCase().includes(activeReport.nature.toLowerCase()));
        let status = "irrelevant";
        if (alreadyAlerted) status = "alerted";
        else if (isRelevant) status = "relevant";
        if (pendingAlertsCount > 0) status = "alerted";
        return { ...s, alreadyAlerted, pendingAlertsCount, status };
      });
  }, [solidaires, activeReport, alerts, user]);

  // -------------------- Alert user --------------------
  const onAlertUser = async (solidaire) => {
  if (!activeReport || !activeReport.id || !user) {
    toast.error("❌ Aucune panne active sélectionnée !");
    return;
  }
  try {
    await addDoc(collection(db, "alertes"), {
      reportId: activeReport.id,
      fromUid: user.uid,
      fromName: user.username || user.email,
      toUid: solidaire.uid,
      ownerName: user.username || user.email,
      status: "en attente",
      nature: activeReport.nature || "Panne",
      timestamp: serverTimestamp(),
    });
    await updateDoc(doc(db, "reports", activeReport.id), {
      status: "aide en cours",
      helperUid: solidaire.uid,
    });
    setActiveReport((prev) =>
      prev ? { ...prev, status: "aide en cours", helperUid: solidaire.uid } : prev
    );
  } catch (err) {
    console.error("Erreur alerte :", err);
    toast.error("⚠️ Impossible d'envoyer l'alerte.");
  }
};


  // -------------------- Cancel report --------------------
  const cancelReport = async (reportId) => {
    if (!user) return;
    try {
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (!reportDoc.exists()) return toast.error("⚠️ Report introuvable.");
      if (reportDoc.data().ownerUid !== user.uid) return toast.error("⛔ Vous ne pouvez pas annuler la panne d'un autre utilisateur !");
      await deleteDoc(doc(db, "reports", reportId));
      setActiveReport(null);
      toast.info("🗑️ Votre demande de panne a été annulée !");
    } catch (err) {
      console.error("Erreur annulation report :", err);
      toast.error("❌ Impossible d'annuler la panne pour le moment.");
    }
  };

  if (!user) return <Auth setUser={setUser} />;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow relative">
        <h1 className="text-xl font-bold">Bienvenue {user.username || user.email}</h1>
        <div className="relative">
          <button
            onClick={() => setShowProfileForm((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg"
          >
            {user.username ? user.username[0].toUpperCase() : "U"}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 relative bg-gray-100">
        {page === "map" && (
          <MapView
            reports={reports}
            solidaires={filteredSolidaires}
            alerts={alerts}
            userPosition={currentPosition}
            onPositionChange={setCurrentPosition}
            onReportClick={setActiveReport}
            onAlertUser={onAlertUser}
            activeReport={activeReport}
            cancelReport={cancelReport}
            currentUserUid={user.uid}
            ref={mapRef}
          />
        )}

        {page === "dashboard" && <Dashboard user={user} />}

        {showProfileForm && (
          <ProfileForm
            user={user}
            onClose={() => setShowProfileForm(false)}
            onUpdate={(updatedUser) => {
              const sanitizedUser = {
                uid: updatedUser.uid,
                name: updatedUser.name,
                username: updatedUser.username,
                email: updatedUser.email,
                materiel: updatedUser.materiel,
                latitude: updatedUser.latitude || 43.4923,
                longitude: updatedUser.longitude || -1.4746,
              };
              setUser(sanitizedUser);
              updateDoc(doc(db, "solidaires", sanitizedUser.uid), sanitizedUser);
            }}
          />
        )}

        {showReportForm && (
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70%] overflow-y-auto z-40">
            <ReportForm
              user={user}
              userPosition={currentPosition}
              onNewReport={async (payload) => {
                if (!user) return;

                try {
                  // Création du report dans Firestore
                  const docRef = await addDoc(collection(db, "reports"), {
                    ...payload,
                    ownerUid: user.uid,
                    helperUid: null,
                    notified: false,
                    status: "en attente",
                    timestamp: serverTimestamp(),
                  });

                  const createdReport = { ...payload, id: docRef.id }; // <-- récupère l'ID Firestore
                  setActiveReport(createdReport);
                  setShowHelperList(true);
                  setShowReportForm(false);

                  toast.success("✅ Demande de panne créée !");
                  return createdReport; // ReportForm peut éventuellement l’utiliser
                } catch (err) {
                  console.error("Erreur création report :", err);
                  toast.error("⚠️ Impossible de créer le rapport.");
                  return null;
                }
              }}
              onClose={() => setShowReportForm(false)}
            />
          </div>
        )}


        {showAlertHistory && <AlertHistory alerts={alerts} onClose={() => setShowAlertHistory(false)} user={user} />}

        {showPanneModal && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-lg p-4 w-[90%] max-w-md max-h-[80%] overflow-y-auto">
              <UserReports userReports={userReports} users={solidaires} cancelReport={cancelReport} />
              <button onClick={() => setShowPanneModal(false)} className="mt-4 w-full bg-gray-200 py-2 rounded-lg">Fermer</button>
            </div>
          </div>
        )}

        {showChat && <Chat user={user} onClose={() => setShowChat(false)} />}

        {showHelperList && (
          <ModalHelperList
            helpers={filteredSolidaires}
            userPosition={currentPosition}
            activeReport={activeReport}
            setShowHelperList={setShowHelperList}
            onClose={() => setShowHelperList(false)}
          />
        )}
      </main>

      {/* Menu flottant */}
      <div className="fixed bottom-0 left-0 w-full bg-white shadow-t z-50">
        <div className="relative flex justify-between items-center px-4 py-3 max-w-screen-lg mx-auto">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowPanneModal(true)}
              className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center"
            >
              ⚡ {userReports.length}
            </button>
            <button onClick={() => setPage("dashboard")} className="flex flex-col items-center text-center">
              <FaTachometerAlt size={24} />
              <span className="text-xs mt-1">Dashboard</span>
            </button>
            <button onClick={() => { if (page !== "map") setPage("map"); else mapRef.current?.recenter?.(); }} className="flex flex-col items-center text-center">
              <FaMapMarkedAlt size={24} />
              <span className="text-xs mt-1">Carte</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <button onClick={() => setShowChat(true)} className="flex flex-col items-center text-center">
              <FaCommentDots size={24} />
              <span className="text-xs mt-1">Chat</span>
            </button>

            <button onClick={() => setShowAlertHistory(true)} className="flex flex-col items-center text-center relative">
              <FaBook size={24} />
              <span className="text-xs mt-1">Feed</span>
              {alerts.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>

            <button onClick={() => setShowHelperList(true)} className="flex flex-col items-center justify-center relative text-center">
              👥
              <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                {onlineUsers}
              </span>
              <span className="text-xs mt-1">En ligne</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bouton + */}
      <div className="fixed bottom-20 right-4 z-50">
        <button onClick={() => setShowReportForm(true)} className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white transition-transform hover:scale-110">+</button>
      </div>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">
        © {new Date().getFullYear()} U-Boto - Tous droits réservés
      </footer>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
