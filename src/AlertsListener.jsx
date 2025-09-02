import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import PaymentBanner from "./PaymentBanner";
import HelpBanner from "./HelpBanner";
import { toast } from "react-toastify";

export default function AlertsListener({ user, setSelectedAlert, userPosition, inline, onNewAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });
  const [inProgressModal, setInProgressModal] = useState({ isOpen: false, report: null });
  const [paymentPending, setPaymentPending] = useState(null);

  // 🔔 Écoute des alertes selon le rôle
  useEffect(() => {
    if (!user?.uid || !user?.role) return;

    let q;
    if (user.role === "solidaire") {
      q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    } else {
      q = query(collection(db, "alertes"), where("fromUid", "==", user.uid));
    }

    const unsub = onSnapshot(q, async (snapshot) => {
      const sorted = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

      console.log("Alertes reçues pour", user.uid, sorted);

      setAlerts(sorted);

      // ⚡ Propager la nouvelle alerte au parent si onNewAlert existe
      if (onNewAlert && sorted.length > 0) {
        onNewAlert(sorted);
      }

      // côté sinistré : vérifier si paiement attendu
      if (user.role === "sinistré") {
        for (const a of sorted) {
          if (a.reportId) {
            const reportSnap = await getDoc(doc(db, "reports", a.reportId));
            if (reportSnap.exists()) {
              const r = reportSnap.data();
              if (r.status === "attente séquestre") {
                setPaymentPending({ id: a.reportId, ...r });
              }
            }
          }
        }
      }
    });

    return () => unsub();
  }, [user, onNewAlert]);

  // 🔹 Accepter une alerte (solidaire)
  const acceptAlert = async (alerte) => {
    if (!alerte?.id || alerte.status === "accepté" || alerte.status === "refusé") return;

    try {
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      setAcceptModal({ isOpen: true, alerte });
      toast.success("✅ Alerte acceptée !");
    } catch (err) {
      console.error("Erreur acceptation :", err);
      toast.error("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  // 🔹 Rejeter une alerte (solidaire)
  const rejectAlert = async (alerte) => {
    if (!alerte?.id) return;
    try {
      await deleteDoc(doc(db, "alertes", alerte.id));
      toast.info("❌ Alerte rejetée !");
    } catch (err) {
      console.error("Erreur rejet :", err);
    }
  };

  const content = (
    <>
      <AcceptModal
        isOpen={acceptModal.isOpen}
        onClose={() => setAcceptModal({ isOpen: false, alerte: null })}
        alerte={acceptModal.alerte}
        onConfirm={() => {}}
      />

      <InProgressModal
        isOpen={inProgressModal.isOpen}
        onClose={() => setInProgressModal({ isOpen: false, report: null })}
        report={inProgressModal.report}
        solidaire={user}
        onComplete={() => setInProgressModal({ isOpen: false, report: null })}
        userPosition={userPosition}
      />

      {paymentPending && user.role === "sinistré" && (
        <PaymentBanner
          report={paymentPending}
          onConfirm={() => setPaymentPending(null)}
        />
      )}

      <HelpBanner
        report={inProgressModal.report || null}
        onComplete={() => setInProgressModal({ isOpen: false, report: null })}
      />

      {alerts.length === 0 ? (
        <p>Aucune alerte pour l’instant</p>
      ) : (
        <ul className="space-y-3">
          {alerts.map((a) => (
            <li key={a.id} className="p-3 rounded-lg shadow-sm bg-yellow-50">
              <h5 className="font-medium">
                🚨 {a.ownerName || a.fromUid || "Inconnu"} : {a.nature || "Panne"}
              </h5>
              {user.role === "solidaire" && (
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-2 py-1 bg-gray-200 rounded"
                    onClick={() => setSelectedAlert(a)}
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
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return inline ? content : (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4 overflow-auto">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full">
        {content}
      </div>
    </div>
  );
}
