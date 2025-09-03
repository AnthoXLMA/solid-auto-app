import React, { useEffect, useState } from "react";
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

      setAlerts(sorted);

      if (onNewAlert && sorted.length > 0) onNewAlert(sorted);

      // ⚡ Pour le solidaire : ouvrir automatiquement la modal sur la première alerte en attente
      if (user.role === "solidaire") {
        const pending = sorted.find(a => a.status === "en attente");
        if (pending && (!currentAlert || pending.id !== currentAlert.id)) {
          setCurrentAlert(pending);
          setSelectedAlert(pending);
        }
      }

      // 🔹 Pour le sinistré : vérifier s'il y a un paiement en attente
      if (user.role === "sinistré") {
        for (const a of sorted) {
          if (a.reportId && (!paymentPending || paymentPending.id !== a.reportId)) {
            const reportSnap = await getDoc(doc(db, "reports", a.reportId));
            if (reportSnap.exists()) {
              const r = reportSnap.data();
              if (r.status === "attente séquestre") setPaymentPending({ id: a.reportId, ...r });
            }
          }
        }
      }
    });

    return () => unsub();
  }, [user, onNewAlert, setSelectedAlert, paymentPending, currentAlert]);

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
      }
      setCurrentAlert(alerte);
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

  // 🔹 JSX final à rendre
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
                <button className="px-2 py-1 bg-gray-200 rounded" onClick={() => { setSelectedAlert(a); setCurrentAlert(a); }}>
                  📍 Voir
                </button>
                <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => acceptAlert(a)}>
                  ✅ Accepter
                </button>
                <button className="px-2 py-1 bg-red-600 text-white rounded" onClick={() => rejectAlert(a)}>
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
