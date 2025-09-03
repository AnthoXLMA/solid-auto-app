import React, { useState, useEffect } from "react";
import { getDistanceKm } from "./utils/distance";
import { collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

export default function ModalHelperList({
  helpers,
  onClose,
  userPosition,
  activeReport,
  onNewAlert,
  setShowHelperList,
  setSelectedAlert
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewsMap, setReviewsMap] = useState({});

  const validHelpers = helpers.filter(
    h => typeof h.latitude === "number" && typeof h.longitude === "number"
  );

  useEffect(() => {
    const fetchReviews = async () => {
      const map = {};
      await Promise.all(
        validHelpers.map(async h => {
          const q = query(collection(db, "reviews"), where("toUid", "==", h.uid));
          const snap = await getDocs(q);
          const avis = snap.docs.map(d => d.data());
          const averageNote = avis.length ? avis.reduce((sum, r) => sum + r.note, 0) / avis.length : 0;
          map[h.uid] = { averageNote, count: avis.length };
        })
      );
      setReviewsMap(map);
    };
    fetchReviews();
  }, [validHelpers]);

  if (!validHelpers.length) return null;

  const currentHelper = validHelpers[currentIndex];
  const distance = getDistanceKm(userPosition[0], userPosition[1], currentHelper.latitude, currentHelper.longitude);

  const handlePrev = () => setCurrentIndex(prev => prev === 0 ? validHelpers.length - 1 : prev - 1);
  const handleNext = () => setCurrentIndex(prev => prev === validHelpers.length - 1 ? 0 : prev + 1);

  const handleAlert = async helper => {
    if (!activeReport) return toast.error("Vous devez avoir un signalement actif !");

    try {
      // 1️⃣ Création alerte
      const docRef = await addDoc(collection(db, "alertes"), {
        reportId: activeReport.id,
        toUid: helper.uid,
        fromUid: activeReport.ownerUid || "sinistré",
        ownerName: activeReport.ownerName || "Sinistré",
        nature: activeReport.nature || "Panne",
        subType: activeReport.subType || "",
        incident: activeReport.incident || "",
        environment: activeReport.environment || "",
        needsTow: activeReport.needsTow || false,
        message: activeReport.message || "",
        timestamp: serverTimestamp(),
        status: "en attente",
      });

      // 2️⃣ Mettre à jour le report avec helperUid
      if (activeReport?.id) {
        await updateDoc(doc(db, "reports", activeReport.id), { helperUid: helper.uid });
      }

      // 3️⃣ Mettre à jour parent et solidaire
      const newAlert = {
        id: docRef.id,
        reportId: activeReport.id,
        toUid: helper.uid,
        fromUid: activeReport.ownerUid,
        ownerName: activeReport.ownerName,
        nature: activeReport.nature,
        subType: activeReport.subType,
        incident: activeReport.incident,
        environment: activeReport.environment,
        needsTow: activeReport.needsTow,
        message: activeReport.message,
        timestamp: new Date(),
        status: "en attente",
      };

      onNewAlert?.(newAlert);
      setSelectedAlert?.(newAlert);

      setShowHelperList(false);
      onClose?.();

      toast.success(`⚡ Alerte envoyée à ${helper.name}`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Impossible d’envoyer l’alerte");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative flex flex-col">
        <h3 className="text-center text-xl font-bold mb-4">Utilisateurs disponibles</h3>

        <div className="flex items-center justify-between gap-2">
          <button onClick={handlePrev} className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300">←</button>

          <div className="flex-1 p-4 border rounded-2xl shadow flex flex-col items-center max-h-[400px] w-full overflow-y-auto">
            <div className="font-medium text-lg text-center">{currentHelper.name}</div>
            <div className="text-sm text-gray-500 text-center mt-1">
              🏷 Rôle : {currentHelper.role?.replace(/_/g, " ") || "Non spécifié"}
            </div>
            <div className="text-sm text-gray-500 text-center mt-1">
              ⭐ Note : {reviewsMap[currentHelper.uid]?.averageNote?.toFixed(1) || "N/A"} ({reviewsMap[currentHelper.uid]?.count || 0} avis)
            </div>
            <div className="text-sm text-gray-500 mt-2 text-center">
              Matériel : {Array.isArray(currentHelper.materiel) ? currentHelper.materiel.join(", ") : currentHelper.materiel || "N/A"}
            </div>
            <div className="text-sm text-gray-400 mt-1 text-center">Distance: {distance.toFixed(1)} km</div>

            <div className="mt-3 text-left text-gray-600 text-sm w-full">
              <p><strong>Panne :</strong> {activeReport?.nature || "N/A"}</p>
              {activeReport?.subType && <p><strong>Sous-type :</strong> {activeReport.subType}</p>}
              {activeReport?.incident && <p><strong>Incident :</strong> {activeReport.incident}</p>}
              {activeReport?.environment && <p><strong>Environnement :</strong> {activeReport.environment}</p>}
              {activeReport?.needsTow && <p><strong>Remorquage nécessaire</strong></p>}
            </div>

            <button
              onClick={() => handleAlert(currentHelper)}
              className="mt-auto bg-blue-600 text-white px-3 py-2 rounded-lg w-full"
              disabled={!activeReport}
              title={!activeReport ? "Vous devez avoir un signalement actif" : ""}
            >
              ⚡ Alerter
            </button>
          </div>

          <button onClick={handleNext} className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300">→</button>
        </div>

        <button onClick={() => { setShowHelperList(false); onClose?.(); }} className="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Fermer</button>
      </div>
    </div>
  );
}
