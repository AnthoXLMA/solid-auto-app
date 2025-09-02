import React, { useState, useEffect } from "react";
import { getDistanceKm } from "./utils/distance";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

export default function ModalHelperList({ helpers, onClose, userPosition, activeReport }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewsMap, setReviewsMap] = useState({}); // { [uid]: { averageNote: 4.5, count: 3 } }

  // Filtrer les helpers avec coords valides
  const validHelpers = helpers.filter(
    (h) => typeof h.latitude === "number" && typeof h.longitude === "number"
  );

  // Récupérer les avis
  useEffect(() => {
    const fetchReviews = async () => {
      const map = {};
      await Promise.all(
        validHelpers.map(async (h) => {
          const q = query(collection(db, "reviews"), where("toUid", "==", h.uid));
          const snap = await getDocs(q);
          const avis = snap.docs.map(d => d.data());
          const averageNote = avis.length > 0
            ? avis.reduce((sum, r) => sum + r.note, 0) / avis.length
            : 0;
          map[h.uid] = { averageNote, count: avis.length };
        })
      );
      setReviewsMap(map);
    };
    fetchReviews();
  }, [validHelpers]);

  if (!validHelpers || validHelpers.length === 0) return null;

  const currentHelper = validHelpers[currentIndex];
  const distance = getDistanceKm(
    userPosition[0],
    userPosition[1],
    currentHelper.latitude,
    currentHelper.longitude
  );

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? validHelpers.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === validHelpers.length - 1 ? 0 : prev + 1));
  };

  // ⚡ Crée une alerte Firestore pour le solidaire
  const handleAlert = async (helper) => {
    if (!activeReport) return toast.error("Vous devez avoir un signalement actif pour alerter un solidaire !");

    try {
      await addDoc(collection(db, "alertes"), {
        reportId: activeReport.id,
        toUid: helper.uid,
        fromUid: activeReport.ownerUid || "sinistre",
        ownerName: activeReport.ownerName || "Sinistré",
        nature: activeReport.nature || "Panne",
        timestamp: serverTimestamp(),
        status: "en attente"
      });
      toast.success(`⚡ Alerte envoyée à ${helper.name}`);
      onClose();
    } catch (err) {
      console.error("Erreur lors de l’envoi de l’alerte :", err);
      toast.error("❌ Impossible d’envoyer l’alerte");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 overflow-hidden relative">
        <h3 className="text-center text-xl font-bold mb-4">Utilisateurs disponibles</h3>

        <div className="flex items-center justify-between">
          <button onClick={handlePrev} className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300">←</button>

          <div className="flex-1 mx-4 p-4 border rounded-2xl shadow flex flex-col items-center
                          h-[280px] w-full max-w-xs overflow-y-auto">
            <div className="font-medium text-lg text-center">{currentHelper.name}</div>

            <div className="text-sm text-gray-500 text-center mt-1">
              🏷 Rôle : {currentHelper.role ? currentHelper.role.replace(/_/g, " ") : "Non spécifié"}
            </div>

            <div className="text-sm text-gray-500 text-center mt-1">
              ⭐ Note : {reviewsMap[currentHelper.uid]?.averageNote?.toFixed(1) || "N/A"} ({reviewsMap[currentHelper.uid]?.count || 0} avis)
            </div>

            <div className="text-sm text-gray-500 text-center mt-2">
              Matériel : {Array.isArray(currentHelper.materiel) ? currentHelper.materiel.join(", ") : currentHelper.materiel || "N/A"}
            </div>

            <div className="text-sm text-gray-400 mt-1 text-center">Distance: {distance} km</div>

            <button
              onClick={() => handleAlert(currentHelper)}
              className="mt-auto bg-blue-600 text-white px-3 py-1 rounded-lg"
              disabled={!activeReport}
              title={!activeReport ? "Vous devez avoir un signalement actif" : ""}
            >
              ⚡ Alerter
            </button>
          </div>

          <button onClick={handleNext} className="text-2xl font-bold px-4 py-2 bg-gray-200 rounded-full hover:bg-gray-300">→</button>
        </div>

        <button onClick={onClose} className="mt-4 w-full py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Fermer</button>
      </div>
    </div>
  );
}
