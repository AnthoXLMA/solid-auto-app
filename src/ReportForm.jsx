// src/ReportForm.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { PANNE_TYPES } from "./constants/pannes";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { createReport } from "./reportService";

export default function ReportForm({ user, userPosition, onClose }) {
  const [nature, setNature] = useState(PANNE_TYPES[0].value);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const carouselRef = useRef(null);
  const startX = useRef(0);
  const [cardWidth, setCardWidth] = useState(0);

  useEffect(() => {
    const firstCard = carouselRef.current?.querySelector(".carousel-card");
    if (firstCard) {
      const style = window.getComputedStyle(firstCard);
      const marginRight = parseInt(style.marginRight, 10);
      setCardWidth(firstCard.offsetWidth + marginRight);
    }
  }, []);

  const onNewReport = async (reportData) => {
    if (!user || !userPosition) {
      toast.error("Utilisateur ou position inconnue !");
      return;
    }

    setLoading(true);
    try {
      const result = await createReport({
        latitude: reportData.latitude,
        longitude: reportData.longitude,
        nature: reportData.nature,
        message: reportData.message || "",
        address: reportData.address || "Adresse inconnue",
        user: { uid: user.uid, displayName: user.name || "Anonyme" },
      });

      if (result.success) {
        toast.success("🚨 Report créé !");
        onClose();
        return result.id;
      } else {
        toast.error("❌ Impossible de créer le report : " + result.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la création du report");
    } finally {
      setLoading(false);
    }
  };

  const currentIndex = PANNE_TYPES.findIndex((p) => p.value === nature);
  const slideNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[nextIndex].value);
  }, [currentIndex]);
  const slidePrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + PANNE_TYPES.length) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[prevIndex].value);
  }, [currentIndex]);

  const onTouchStart = useCallback((e) => {
    startX.current = e.touches[0].clientX;
  }, []);
  const onTouchEnd = useCallback(
    (e) => {
      const diff = e.changedTouches[0].clientX - startX.current;
      if (diff > 30) slidePrev();
      if (diff < -30) slideNext();
    },
    [slideNext, slidePrev]
  );

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.addEventListener("touchstart", onTouchStart, { passive: true });
    carousel.addEventListener("touchend", onTouchEnd);
    return () => {
      carousel.removeEventListener("touchstart", onTouchStart);
      carousel.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchEnd]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !userPosition) return toast.error("Utilisateur ou position inconnue !");
    await onNewReport({
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature,
      message,
      ownerUid: user.uid,
      ownerName: user.name || null,
      address: "Adresse inconnue",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end bg-black/50 p-4">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden
                   max-h-[90vh] animate-fade-in"
        style={{ marginBottom: "120px" }}
      >
        <h3 className="text-center text-xl font-bold p-4 border-b">Signaler une panne</h3>

        {/* Carousel */}
        <div className="relative p-4">
          <button
            type="button"
            onClick={slidePrev}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="overflow-hidden">
            <div
              ref={carouselRef}
              className="flex transition-transform duration-300"
              style={{ transform: `translateX(-${currentIndex * cardWidth}px)` }}
            >
              {PANNE_TYPES.map((p) => (
                <div
                  key={p.value}
                  onClick={() => setNature(p.value)}
                  className={`carousel-card flex-shrink-0 flex flex-col items-center justify-center w-40 h-40 p-4 mr-4 rounded-lg border cursor-pointer transition-colors ${
                    nature === p.value
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  <div className="text-4xl mb-2">{p.icon}</div>
                  <div className="text-center font-medium">{p.label}</div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={slideNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white shadow rounded-full p-2 hover:bg-gray-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="px-4 flex-1 overflow-y-auto">
          <textarea
            placeholder="De quoi avez-vous besoin ?"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
            rows={3}
          />
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border bg-gray-200 hover:bg-gray-300 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            {loading ? "⏳ Envoi..." : "Envoyer"}
          </button>
        </div>
      </div>
    </div>
  );
}
