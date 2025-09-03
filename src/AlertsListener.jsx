// src/AlertsListener.jsx
import React, { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import PaymentBanner from "./PaymentBanner";
import HelpBanner from "./HelpBanner";
import { toast } from "react-toastify";

export default function AlertsListener({ user, setSelectedAlert, userPosition, onNewAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [paymentPending, setPaymentPending] = useState(null);

  // Ref pour éviter de spammer les toasts
  const lastToastId = useRef(null);

  // 🔔 Écoute des alertes en temps réel
  useEffect(() => {
    if (!user?.uid || !user?.role) return;

    const q = query(
      collection(db, "alertes"),
      user.role === "solidaire"
        ? where("toUid", "==", user.uid)
        : where("fromUid", "==", user.uid)
    );

    const unsub = onSnapshot(q, async snapshot => {
      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      console.log("⚡ [AlertsListener] Alertes reçues :", sorted);

      setAlerts(sorted);

      if (onNewAlert && sorted.length > 0) onNewAlert(sorted);

      // ⚡ Pour le solidaire : ouvrir automatiquement la première alerte "en attente"
      if (user.role === "solidaire") {
        const pending = sorted.find(a => ["en attente", "envoyée"].includes(a.status));
        if (pending && (!currentAlert || pending.id !== currentAlert.id)) {
          setCurrentAlert(pending);
          setSelectedAlert(pending);

          // éviter les doublons de toast
          if (lastToastId.current !== pending.id) {
            toast.info(`🚨 Nouvelle alerte de ${pending.ownerName || pending.fromUid}`);
            lastToastId.current = pending.id;
          }
        }
      }

      // 🔹 Pour le sinistré : vérifier paiement en attente
      if (user.role === "sinistré") {
        const reports = await Promise.all(
          sorted
            .filter(a => a.reportId && (!paymentPending || paymentPending.id !== a.reportId))
            .map(async a => {
              const snap = await getDoc(doc(db, "reports", a.reportId));
              return snap.exists() ? { id: a.reportId, ...snap.data() } : null;
            })
        );

        const waiting = reports.find(r => r && r.status === "attente séquestre");
        if (waiting) setPaymentPending(waiting);
      }
    });

    return () => unsub();
  }, [user, onNewAlert, setSelectedAlert]); // ✅ pas de dépendances instables ici

  // 🔹 Nettoyage si l'alerte courante disparaît
  useEffect(() => {
    if (!alerts.find(a => a.id === currentAlert?.id)) {
      setCurrentAlert(null);
      setSelectedAlert(null);
    }
  }, [alerts, currentAlert, setSelectedAlert]);

  // 🔹 Accepter une alerte
  const acceptAlert = async alerte => {
    if (!alerte?.id || ["accepté", "refusé"].includes(alerte.status)) return;
    try {
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });

      if (alerte.reportId) {
        await updateDoc(doc(db, "reports", alerte.reportId), { helperConfirmed: true });

        // charger le rapport complet pour ouvrir la modal "InProgress"
        const snap = await getDoc(doc(db, "reports", alerte.reportId));
        if (snap.exists()) setCurrentReport({ id: snap.id, ...snap.data() });
      }

      setCurrentAlert({ ...alerte, status: "accepté" }); // ✅ maj locale immédiate
      toast.success("✅ Alerte acceptée !");
    } catch (err) {
      console.error("Erreur acceptation :", err);
      toast.error("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  // 🔹 Rejeter une alerte
  const rejectAlert = async alerte => {
    if (!alerte?.id) return;
    try {
      await deleteDoc(doc(db, "alertes", alerte.id));
      setSelectedAlert(null);
      setCurrentAlert(null);
      toast.info("❌ Alerte rejetée !");
    } catch (err) {
      console.error("Erreur rejet :", err);
    }
  };

  return (
    <>
      {/* Modals */}
      <AcceptModal
        isOpen={!!currentAlert}
        onClose={() => { setCurrentAlert(null); setSelectedAlert(null); }}
        alerte={currentAlert}
      />
      <InProgressModal
        isOpen={!!currentReport}
        onClose={() => setCurrentReport(null)}
        report={currentReport}
        solidaire={user}
        onComplete={() => setCurrentReport(null)}
        userPosition={userPosition}
      />
      {paymentPending && user.role === "sinistré" && (
        <PaymentBanner
          report={paymentPending}
          onConfirm={() => setPaymentPending(null)}
        />
      )}
      <HelpBanner
        report={currentReport || null}
        onComplete={() => setCurrentReport(null)}
      />

      {/* Liste des alertes pour le solidaire */}
      {alerts.length > 0 && user.role === "solidaire" && (
        <ul className="space-y-3">
          {alerts.map(a => (
            <li key={a.id} className="p-3 rounded-lg shadow-sm bg-yellow-50">
              <h5 className="font-medium">
                🚨 {a.ownerName || a.fromUid || "Inconnu"} : {a.nature || "Panne"}
              </h5>
              <div className="flex gap-2 mt-2">
                <button
                  className="px-2 py-1 bg-gray-200 rounded"
                  onClick={() => { setSelectedAlert(a); setCurrentAlert(a); }}
                >
                  📍 Voir
                </button>
                <button
                  className="px-2 py-1 bg-green-600 text-white rounded"
                  onClick={() => acceptAlert(a)}
                >
                  ✅ Accepter
                </button>
                <button
                  className="px-2 py-1 bg-red-600 text-white rounded"
                  onClick={() => rejectAlert(a)}
                >
                  ❌ Refuser
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
