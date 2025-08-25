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
import "./AlertsListener.css"; // fichier CSS pour l'animation
import AcceptModal from "./AcceptModal";
import { toast } from "react-toastify";

export default function AlertsListener({ user, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));

    const unsub = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

  const removeAlertWithAnimation = (id) => {
    setRemovingIds((prev) => [...prev, id]);
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      setRemovingIds((prev) => prev.filter((rid) => rid !== id));
    }, 300);
  };

  // ✅ Accepter une alerte (ouvre le modal de calcul des frais)
  const acceptAlert = async (alerte) => {
    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        console.warn("⚠️ Report introuvable :", alerte.reportId);
        await deleteDoc(doc(db, "alertes", alerte.id));
        removeAlertWithAnimation(alerte.id);
        toast.error("⚠️ Rapport introuvable. Alerte supprimée.");
        return;
      }

      setAcceptModal({ isOpen: true, alerte });
    } catch (err) {
      console.error("Erreur acceptation :", err);
      toast.error("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  // ✅ Confirmation depuis le modal (calcul + update Firestore)
  const handleConfirmPricing = async (alerte, montant, fraisAnnules) => {
    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        console.warn("⚠️ Report introuvable :", alerte.reportId);
        await deleteDoc(doc(db, "alertes", alerte.id));
        removeAlertWithAnimation(alerte.id);
        toast.error("⚠️ Rapport introuvable. Alerte supprimée.");
        return;
      }

      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(reportRef, {
        status: "aide en cours",   // 🔥 cohérent avec App.jsx
        helperUid: user.uid,
        frais: fraisAnnules ? 0 : montant,
      });

      removeAlertWithAnimation(alerte.id);
      setAcceptModal({ isOpen: false, alerte: null });
      toast.success("✅ Vous avez accepté d’aider !");
    } catch (err) {
      console.error("Erreur pricing :", err);
      toast.error("❌ Erreur lors du calcul des frais.");
    }
  };

  // ✅ Rejeter une alerte
  const rejectAlert = async (alerte) => {
    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);

      if (reportSnap.exists()) {
        await updateDoc(reportRef, { status: "aide refusée" });
      }

      await deleteDoc(doc(db, "alertes", alerte.id));
      removeAlertWithAnimation(alerte.id);
      toast.info("❌ Vous avez rejeté l’alerte.");
    } catch (err) {
      console.error("Erreur rejet :", err);
      toast.error("❌ Une erreur est survenue lors du rejet.");
    }
  };

  console.log("Modal ouvert ?", acceptModal);

  return (
    <div style={{ padding: "10px", background: "#fff3cd", borderRadius: "8px" }}>

      <h4>📢 Mes alertes reçues</h4>

      <AcceptModal
        isOpen={acceptModal.isOpen}
        onClose={() => setAcceptModal({ isOpen: false, alerte: null })}
        alerte={acceptModal.alerte}
        onConfirm={handleConfirmPricing}
      />

      {alerts.length === 0 ? (
        <p>Aucune alerte pour l’instant</p>
      ) : (
        <ul>
          {alerts.map((a) => (
            <li
              key={a.id}
              className={removingIds.includes(a.id) ? "fade-out" : ""}
              style={{ marginBottom: "8px", transition: "opacity 0.3s" }}
            >
              🚨 {a.fromUid} vous demande de l’aide (report: {a.reportId})
              <button onClick={() => setSelectedAlert(a)}>📍 Géolocaliser</button>

              <button
                style={{ marginLeft: "10px" }}
                onClick={() => acceptAlert(a)}
              >
                ✅ Proposer mon aide
              </button>

              <button
                style={{
                  marginLeft: "5px",
                  cursor: "pointer",
                  backgroundColor: "#f8d7da",
                  border: "none",
                }}
                onClick={() => rejectAlert(a)}
              >
                ❌ Rejeter
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
