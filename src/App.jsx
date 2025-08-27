import React, { useState, useEffect } from "react";
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
import { useRef } from "react";

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
  const [page, setPage] = useState("map"); // valeur par défaut
  const userReports = useReportsListener(user);
 const mapRef = useRef(null);


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

  useEffect(() => {
  // Écoute l’état de l’authentification
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      // L’utilisateur vient de se connecter → dispo + online
      await updateUserStatus(currentUser.uid, "disponible", true, null);
    } else {
      // Il se déconnecte → offline
      if (auth.currentUser) {
        await updateUserStatus(auth.currentUser.uid, "disponible", false, null);
      }
    }
  });

  return () => unsubscribe(); // cleanup
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
  // useEffect(() => {
  //   const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
  //     setSolidaires(snapshot.docs.map((doc) => doc.data()));
  //   });
  //   return () => unsub();
  // }, []);

  useEffect(() => {
  const unsub = onSnapshot(collection(db, "solidaires"), (snapshot) => {
    const allSolidaires = snapshot.docs.map((doc) => doc.data());
    setSolidaires(allSolidaires);

    // Nombre de solidaires en ligne
    const onlineCount = allSolidaires.filter((s) => s.online).length;
    setOnlineUsers(onlineCount);
  });
  return () => unsub();
}, []);


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

    // Marquer comme online quand connecté
    setDoc(userRef, { online: true }, { merge: true }).catch(() => {});

    // Marquer offline quand on quitte
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
          name: user.email,
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

  useEffect(() => {
  if (!user) return;
  const q = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
  const unsub = onSnapshot(q, (snapshot) => {
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.notificationForOwner) {
        toast.info(data.notificationForOwner);
        // Supprimer le champ pour ne pas répéter le toast
        updateDoc(doc(db, "reports", docSnap.id), { notificationForOwner: null });
      }
    });
  });
  return () => unsub();
}, [user]);

  //Fonction Navigate pour la redirection des icones du menu flottan
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

  function ChatButton({ activeReport, unreadMessages }) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleClick = () => {
    if (activeReport?.helperConfirmed) {
      // Il y a une intervention en cours → ouvrir le chat
      setIsChatOpen(true);
    } else {
      // Pas d'intervention → message informatif
      toast.info("Vous n'avez aucune panne à signaler - souhaitez-vous signaler une panne ?");
    }
  };

    return (
    <>
      <button
        onClick={handleClick}
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

      {/* Popup du chat */}
      {isChatOpen && (
        <Chat
          reportId={activeReport.id}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </>
  );
}

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
      currentUserUid={user.uid}
      ref={mapRef}
    />
  </div>

{/* Menu flottant style Waze compact */}
<div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-white rounded-xl shadow-lg p-2 flex items-center space-x-4 z-40 max-w-xs">

  {/* Badge pannes actives */}
  <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
    ⚡ {reports.length}
  </span>

  {/* Carte */}
  <button onClick={() => mapRef.current?.recenter()} className="flex flex-col items-center">
    <FaGlobe size={24} />
    <span className="text-xs mt-1">Carte</span>
  </button>

  {/* Chat */}
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

  {/* Feed */}
  <button
    onClick={() => navigateTo("feed")}
    className="flex flex-col items-center"
  >
    <FaBook size={24} />
    <span className="text-xs mt-1">Feed</span>
  </button>

  {/* Badge utilisateurs en ligne */}
  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
    👥 {onlineUsers}
  </span>

  {/* PayButton : visible uniquement si paiement requis */}
  {activeReport?.helperConfirmed && activeReport.frais > 0 && (
    <div className="flex flex-col items-center">
      <PayButton report={activeReport} />
    </div>
  )}

</div>


{/* Bouton + SUR la carte */}
<button
  onClick={() => setShowReportForm(true)}
  className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700
             rounded-full shadow-2xl flex items-center justify-center
             text-white text-4xl font-bold border-4 border-white
             transition-transform transform hover:scale-110 z-50"
>
  +
</button>

  {/* Bottom sheet : Report Form */}
  {showReportForm && (
    <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-lg p-4 max-h-[70%] overflow-y-auto z-40">
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

