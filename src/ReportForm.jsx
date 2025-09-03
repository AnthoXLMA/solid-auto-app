// src/ReportForm.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { PANNE_TYPES } from "./constants/pannes";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ReportForm({
  user,
  userPosition,
  onClose,
  onNewReport, // callback parent pour créer le report
}) {
  const [step, setStep] = useState(1);
  const [nature, setNature] = useState(PANNE_TYPES[0]?.value || "");
  const [subType, setSubType] = useState("");
  const [incident, setIncident] = useState("");
  const [message, setMessage] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [environment, setEnvironment] = useState("");
  const [needsTow, setNeedsTow] = useState(false);
  const [loading, setLoading] = useState(false);

  const carouselRef = useRef(null);
  const startX = useRef(0);
  const [cardWidth, setCardWidth] = useState(0);

  // Calcul largeur des cartes pour le carousel
  useEffect(() => {
    const firstCard = carouselRef.current?.querySelector(".carousel-card");
    if (firstCard) {
      const style = window.getComputedStyle(firstCard);
      const marginRight = parseInt(style.marginRight, 10) || 0;
      setCardWidth(firstCard.offsetWidth + marginRight);
    }
  }, []);

  const currentIndex = PANNE_TYPES.findIndex((p) => p.value === nature);

  const slideNext = useCallback(() => {
    const nextIndex = (currentIndex + 1) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[nextIndex].value);
  }, [currentIndex]);

  const slidePrev = useCallback(() => {
    const prevIndex = (currentIndex - 1 + PANNE_TYPES.length) % PANNE_TYPES.length;
    setNature(PANNE_TYPES[prevIndex].value);
  }, [currentIndex]);

  // Touch gestures
  const onTouchStart = useCallback((e) => { startX.current = e.touches[0].clientX; }, []);
  const onTouchEnd = useCallback((e) => {
    const diff = e.changedTouches[0].clientX - startX.current;
    if (diff > 30) slidePrev();
    if (diff < -30) slideNext();
  }, [slideNext, slidePrev]);

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

  const panneOptions = {
    batterie: ["Batterie vide", "Cosses corrodées", "Démarreur"],
    carburant: ["Plus d'essence", "Mauvais carburant", "Fuite carburant"],
    pneu: ["Crevaison", "Pneu déjanté", "Valve cassée"],
  };

  const incidentOptions = [
    { label: "Choc", emoji: "💥" },
    { label: "Feux allumés", emoji: "🔥" },
    { label: "Explosion", emoji: "💣" },
    { label: "Rien de spécial", emoji: "ℹ️" },
  ];

  const environmentOptions = [
    { label: "Chemin", emoji: "🛤️" },
    { label: "Route départementale", emoji: "🛣️" },
    { label: "Route nationale", emoji: "🚧" },
    { label: "Autoroute", emoji: "🛣️💨" },
  ];

  const buildReportPayload = () => ({
    latitude: Array.isArray(userPosition) ? userPosition[0] : null,
    longitude: Array.isArray(userPosition) ? userPosition[1] : null,
    nature,
    subType,
    incident,
    message,
    date,
    time,
    environment,
    needsTow,
    ownerUid: user?.uid || null,
    ownerName: user?.username || user?.name || user?.email || "Anonyme",
    address: "Adresse inconnue",
    timestamp: new Date().toISOString(),
    frais: 0,
    helperConfirmed: false,
  });

  const handleSubmit = async (e) => {
    e?.preventDefault?.();

    if (!userPosition || !Array.isArray(userPosition) || userPosition.length < 2) return;
    if (!nature) return;

    const payload = buildReportPayload();
    setLoading(true);

    try {
      // onNewReport doit gérer toast et fermeture du modal
      await onNewReport?.(payload);
      onClose?.();
    } catch (err) {
      console.error("Erreur submit:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-end bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col overflow-hidden max-h-[90vh] animate-fade-in" style={{ marginBottom: "120px" }}>
        {/* Header */}
        <div className="p-4 border-b">
          <h3 className="text-center text-xl font-bold">Signaler une panne</h3>
        </div>

        {/* STEP 1: Carousel */}
        {step === 1 && (
          <div className="p-4">
            <div className="relative">
              <button onClick={slidePrev} className="absolute left-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow">←</button>
              <div className="overflow-hidden">
                <div ref={carouselRef} className="flex transition-transform" style={{ transform: `translateX(-${currentIndex * cardWidth}px)` }}>
                  {PANNE_TYPES.map((p) => (
                    <div key={p.value} onClick={() => setNature(p.value)} className={`carousel-card w-40 h-40 p-4 mr-4 flex flex-col items-center justify-center cursor-pointer rounded-lg border ${nature === p.value ? "bg-blue-50 border-blue-600" : "bg-white border-gray-300"}`}>
                      <div className="text-4xl mb-2">{p.icon}</div>
                      <div className="text-center">{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={slideNext} className="absolute right-0 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow">→</button>
            </div>

            <button onClick={() => setStep(2)} className="w-full py-2 mt-4 bg-blue-600 text-white rounded-lg">Continuer (détails)</button>
            <button onClick={onClose} className="w-full py-2 mt-2 border rounded-lg">Annuler</button>
          </div>
        )}

        {/* STEP 2: Details */}
        {step === 2 && (
          <form className="px-4 py-3 flex-1 overflow-y-auto" onSubmit={handleSubmit}>
            <h4 className="text-lg font-semibold text-center mb-3">{nature}</h4>

            {/* Sous-type */}
            <div className="mb-3">
              <div className="text-sm font-medium mb-2">Sous-type</div>
              <div className="grid grid-cols-2 gap-2">
                {(panneOptions[nature] || ["Autre"]).map(opt => (
                  <button key={opt} type="button" onClick={() => setSubType(opt)} className={`p-3 rounded-lg border ${subType === opt ? "bg-blue-100 border-blue-600" : "bg-white border-gray-300"}`}>{opt}</button>
                ))}
              </div>
            </div>

            {/* Incident */}
            <div className="mb-3">
              <div className="text-sm font-medium mb-2">Que s'est-il passé ?</div>
              <div className="flex gap-2 overflow-x-auto">
                {incidentOptions.map(inc => (
                  <button key={inc.label} type="button" onClick={() => setIncident(inc.label)} className={`flex flex-col items-center p-2 rounded-lg border ${incident === inc.label ? "bg-red-100 border-red-500" : "bg-white border-gray-300"}`}>
                    <span className="text-2xl">{inc.emoji}</span>
                    <span className="text-xs">{inc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description libre */}
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Description (facultatif)" className="w-full p-3 border rounded-lg mb-3" rows={3} />

            {/* Date & heure */}
            <div className="flex gap-2 mb-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 p-2 border rounded-lg" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="flex-1 p-2 border rounded-lg" />
            </div>

            {/* Environnement */}
            <div className="mb-3">
              <div className="text-sm font-medium mb-2">Environnement</div>
              <div className="flex gap-2 overflow-x-auto">
                {environmentOptions.map(env => (
                  <button key={env.label} type="button" onClick={() => setEnvironment(env.label)} className={`flex flex-col items-center p-2 rounded-lg border ${environment === env.label ? "bg-yellow-100 border-yellow-500" : "bg-white border-gray-300"}`}>
                    <span className="text-xl">{env.emoji}</span>
                    <span className="text-xs">{env.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Remorquage */}
            <label className="flex items-center gap-2 mb-4">
              <input type="checkbox" checked={needsTow} onChange={(e) => setNeedsTow(e.target.checked)} />
              Besoin d’un remorquage ?
            </label>

            {/* Actions */}
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-2 border rounded-lg">Retour</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 bg-blue-600 text-white rounded-lg">{loading ? "⏳ Envoi..." : "Envoyer & Trouver un aide"}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
