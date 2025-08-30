import React, { useState, useEffect, useRef } from "react";
import './index.css';
import Auth from "./Auth";
import MapView from "./MapView";
import ReportForm from "./ReportForm";
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
import { updateUserStatus } from "./userService";
import { useNavigate } from "react-router-dom";
import { FaGlobe, FaCommentDots, FaBook } from "react-icons/fa";
import Chat from "./Chat";
import ProfileForm from "./ProfileForm";
import AlertHistory from "./AlertHistory";
import { FaTachometerAlt, FaMapMarkedAlt } from "react-icons/fa";
import Dashboard from "./Dashboard";

export default function App() {
  const [user, setUser] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [reports, setReports] = useState([]);
  const [solidaires, setSolidaires] = useState([]);
  const [activeReport, setActiveReport] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [page, setPage] = useState("map");
  const userReports = useReportsListener(user);
  const mapRef = useRef(null);
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [isInProgressOpen, setIsInProgressOpen] = useState(false);
  const [showHelperList, setShowHelperList] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [showAlertHistory, setShowAlertHistory] = useState(false);
  const [showPanneModal, setShowPanneModal] = useState(false);

  // Auth
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

  // Ouvrir automatiquement le modal "Signaler une panne"
  // useEffect(() => {
  //   if (user && !activeReport) {
  //     setShowReportForm(true);
  //   }
  // }, [user, activeReport]);

  // Ouvrir le modal "Signaler une panne" uniquement à l'inscription
  useEffect(() => {
  const checkFirstModal = async () => {
    if (!user?.uid) return;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const data = userSnap.data();
      if (!data.hasSeenFirstPanneModal) {
        setShowPanneModal(true); // afficher le modal
        await updateDoc(userRef, { hasSeenFirstPanneModal: true }); // marquer comme vu
      }
    }
  };

  checkFirstModal();
}, [user]);


  // Logout
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
        () => setCurrentPosition([46.959095, 4.858485]) // Beaune, France
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

  // Écoute état authentification
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await updateUserStatus(currentUser.uid, "disponible", true, null);
      } else {
        if (auth.currentUser) {
          await updateUserStatus(auth.currentUser.uid, "disponible", false, null);
        }
      }
    });

    return () => unsubscribe();
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
      const allSolidaires = snapshot.docs.map((doc) => doc.data());
      setSolidaires(allSolidaires);

      const onlineCount = allSolidaires.filter((s) => s.online).length;
      setOnlineUsers(onlineCount);
    });
    return () => unsub();
  }, []);

  // Premier login
  useEffect(() => {
    if (user?.isFirstLogin) {
      setShowReportForm(true);
      setUser((prev) => ({ ...prev, isFirstLogin: false }));
    }
  }, [user]);

  // Écoute messages non lus
  useEffect(() => {
    if (!user) return;
    const q = collection(db, "chats");
    const unsub = onSnapshot(q, (snapshot) => {
      let count = 0;
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (data.participants.includes(user.uid)) {
          count += data.messages?.filter((m) => !m.read && m.toUid === user.uid).length || 0;
        }
      });
      setUnreadMessages(count);
    });
    return () => unsub();
  }, [user]);

  // Online / Offline
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "solidaires", user.uid);
    setDoc(userRef, { online: true }, { merge: true }).catch(() => {});

    const handleBeforeUnload = () => {
      setDoc(userRef, { online: false }, { merge: true }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      setDoc(userRef, { online: false }, { merge: true }).catch(() => {});
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  // Mise à jour position
  useEffect(() => {
    if (user && currentPosition) {
      setDoc(
        doc(db, "solidaires", user.uid),
        {
          uid: user.uid,
          name: user.name || user.email,
          latitude: currentPosition[0],
          longitude: currentPosition[1],
          materiel: user.materiel || "batterie",
          online: true,
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

  // Notifications pour l’utilisateur
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.notificationForOwner) {
          toast.info(data.notificationForOwner);
          updateDoc(doc(db, "reports", docSnap.id), { notificationForOwner: null });
        }
      });
    });
    return () => unsub();
  }, [user]);

  // Navigation
  const navigate = useNavigate();
  const navigateTo = (path) => {
    navigate(`/${path}`);
    console.log("Naviguer vers :", page);
  };

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
    .filter((s) => s.uid !== user?.uid)
    .map((s) => {
      if (!activeReport) return { ...s, status: "normal" };

      const pendingAlertsCount = alerts.filter((a) => a.toUid === s.uid).length;
      const alreadyAlerted = s.alerts?.includes(activeReport.id) || false;

      const materielArray = Array.isArray(s.materiel)
        ? s.materiel
        : typeof s.materiel === "string"
        ? [s.materiel]
        : [];

      const isRelevant =
        activeReport.nature &&
        materielArray.some((m) =>
          m.toLowerCase().includes(activeReport.nature.toLowerCase())
        );

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

  // Annuler un report
  const cancelReport = async (reportId) => {
    if (!user) return;
    try {
      const reportDoc = await getDoc(doc(db, "reports", reportId));
      if (!reportDoc.exists()) {
        toast.error("⚠️ Report introuvable.");
        return;
      }

      const reportData = reportDoc.data();
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

  // Chat Button
  function ChatButton({ activeReport, unreadMessages }) {
    const [isChatOpen, setIsChatOpen] = useState(false);

    const handleClick = () => {
      if (activeReport?.helperConfirmed) {
        setIsChatOpen(true);
      } else {
        toast.info("Vous n'avez aucune panne à signaler - souhaitez-vous signaler une panne ?");
      }
    };

    return (
      <>
        <button onClick={handleClick} className="flex flex-col items-center relative">
          <FaCommentDots size={24} />
          <span className="text-xs mt-1">Chat</span>
          {unreadMessages > 0 && activeReport?.helperConfirmed && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full">
              {unreadMessages}
            </span>
          )}
        </button>

        {isChatOpen && (
          <Chat reportId={activeReport.id} onClose={() => setIsChatOpen(false)} />
        )}
      </>
    );
  }


  if (!user) return <Auth setUser={setUser} />;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow relative">
        <h1 className="text-xl font-bold">Bienvenue {user.username || user.email}</h1>
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-white text-blue-600 flex items-center justify-center font-bold text-lg"
          >
            {user.username ? user.username[0].toUpperCase() : "U"}
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white text-black shadow-lg rounded-lg z-50">
              <div className="px-4 py-2 border-b font-medium">{user.username || "Utilisateur"}</div>
              <button
                onClick={() => {
                  setShowProfileForm(true);
                  setShowProfileMenu(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                Éditer profil
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative bg-gray-100">
        {page === "map" && (
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
              currentUserUid={user.uid}
              ref={mapRef}
              showHelperList={showHelperList}
              setShowHelperList={setShowHelperList}
            />
          </div>
        )}

        {page === "dashboard" && <Dashboard user={user} />}

        {/* Garder les modals/bottom sheets */}
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
              setDoc(doc(db, "solidaires", sanitizedUser.uid), sanitizedUser, { merge: true });
            }}
          />
        )}

        {/* ...tout le reste des bottom sheets, modals et notifications */}

        {/* Menu flottant */}
        <div className="fixed bottom-0 left-0 w-full bg-white shadow-t py-4 flex justify-between items-center z-50">
          {/* Gauche */}
          <div className="flex items-center space-x-4 ml-4">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
              ⚡ {reports.length}
            </span>
            <button onClick={() => mapRef.current?.recenter()} className="flex flex-col items-center justify-center">
              <FaGlobe size={24} />
              <span className="text-xs mt-1">Map</span>
            </button>
            {/* Dashboard */}
              <button
                onClick={() => setPage("dashboard")}
                className="flex flex-col items-center justify-center"
              >
                <FaTachometerAlt size={24} />
                <span className="text-xs mt-1">Dashboard</span>
              </button>

              {/* Retour Carte */}
              <button
                onClick={() => setPage("map")}
                className="flex flex-col items-center justify-center"
              >
                <FaMapMarkedAlt size={24} />
                <span className="text-xs mt-1">Carte</span>
              </button>
          </div>

          {/* Centre */}
          <div className="absolute left-1/2 transform -translate-x-1/2 -top-10 z-50">
            <button
              onClick={() => setShowReportForm(true)}
              className="w-16 h-16 bg-blue-600 hover:bg-blue-700 rounded-full shadow-2xl flex items-center justify-center text-white text-4xl font-bold border-4 border-white transition-transform hover:scale-110"
            >
              +
            </button>
          </div>

          {/* Droite */}
          <div className="flex items-center space-x-4 mr-4">
            <button
              onClick={() => {
                if (activeReport?.helperConfirmed) {
                  navigateTo("chat");
                } else {
                  toast.info("💬 Vous pouvez initier une nouvelle panne ou contacter un solidaire en cliquant ici.");
                }
              }}
              className="flex flex-col items-center relative"
            >
              <FaCommentDots size={24} />
              <span className="text-xs mt-1">Chat</span>
              {unreadMessages > 0 && activeReport?.helperConfirmed && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-1 rounded-full">
                  {unreadMessages}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowAlertHistory(true)}
              className="flex flex-col items-center relative"
            >
              <FaBook size={24} />
              <span className="text-xs mt-1">Feed</span>
              {alerts.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full flex items-center justify-center animate-pulse">
                  {alerts.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowHelperList(true)}
              className="flex flex-col items-center relative"
            >
              👥
              <span className="absolute -top-2 -right-2 bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
                {onlineUsers}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom sheets */}
        {showReportForm && (
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70%] overflow-y-auto z-40">
            <ReportForm
              userPosition={currentPosition}
              onNewReport={(r) => {
                handleNewReport(r);
                setShowReportForm(false);
              }}
              onClose={() => setShowReportForm(false)}
            />
            <button
              onClick={() => setShowReportForm(false)}
              className="mt-2 w-full bg-gray-200 py-2 rounded-lg"
            >
              Fermer
            </button>
          </div>
        )}

        {user && alerts.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-300 p-4 rounded-t-2xl shadow-lg z-40">
            <AlertsListener
              user={user}
              setSelectedAlert={setSelectedAlert}
              userPosition={currentPosition}
            />
          </div>
        )}

        {activeReport && activeReport.helperUid && activeReport.status === "aide en cours" && user?.uid === activeReport.ownerUid && (
          <div className="fixed bottom-24 left-4 right-4 bg-white rounded-xl shadow-lg p-4 z-40">
            <PayButton report={activeReport} />
          </div>
        )}

        {showAlertHistory && (
          <AlertHistory alerts={alerts} onClose={() => setShowAlertHistory(false)} />
        )}

        {showPanneModal && (
          <ReportForm
            userPosition={currentPosition}
            onNewReport={(r) => {
              handleNewReport(r);
              setShowPanneModal(false);
            }}
            onClose={() => setShowPanneModal(false)}
          />
        )}
      </main>

      <footer className="bg-gray-100 text-center text-sm text-gray-500 p-2">
        © {new Date().getFullYear()} U-Boto - Tous droits réservés
      </footer>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}
