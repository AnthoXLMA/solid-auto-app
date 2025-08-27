import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import AcceptModal from "./AcceptModal";
import InProgressModal from "./InProgressModal";
import { toast } from "react-toastify";
import { updateUserStatus } from "./userService";
import { createEscrow, releaseEscrow, refundEscrow } from "./services/escrowService";
import HelpBanner from "./HelpBanner";


export default function AlertsListener({ user, currentSolidaire, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });
  const [inProgressModal, setInProgressModal] = useState({ isOpen: false, report: null });
  const [paymentStatus, setPaymentStatus] = useState(null); // pour suivre l’escrow

  // 🔥 Statut du solidaire en ligne
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { status: "disponible" }).catch(() => {});
    return () => updateDoc(userRef, { status: "indisponible" }).catch(() => {});
  }, [user]);

  // 🔔 Écoute des alertes
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      const newStatus = snapshot.docs.length > 0 ? "en attente de réponse" : "disponible";
      updateDoc(doc(db, "users", user.uid), { status: newStatus }).catch(() => {});
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

  const acceptAlert = async (alerte) => {
    try {
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(doc(db, "users", user.uid), { status: "aide en cours" });
      setAcceptModal({ isOpen: true, alerte });
    } catch (err) {
      console.error("Erreur acceptation :", err);
      toast.error("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  const handleConfirmPricing = async (alerte, montant, fraisAnnules) => {
    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);

      if (!reportSnap.exists()) {
        await deleteDoc(doc(db, "alertes", alerte.id));
        removeAlertWithAnimation(alerte.id);
        toast.error("⚠️ Rapport introuvable. Alerte supprimée.");
        return;
      }

      const reportData = reportSnap.data();
      const reportOwnerUid = reportData.ownerUid;

      // Mise à jour des statuts côté Firebase
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(reportRef, {
        status: "aide en cours",
        helperUid: user.uid,
        helperConfirmed: true,
        frais: fraisAnnules ? 0 : montant,
        notificationForOwner: `🚨 Solidaire en route pour vous aider. Montant du dépannage : ${
          fraisAnnules ? "0 €" : montant + " €"
        }`,
      });
      await updateUserStatus(user.uid, "aide en cours", true, alerte.reportId);

      // 1️⃣ Créer l’escrow pour bloquer l’argent
      await createEscrow(alerte.reportId, fraisAnnules ? 0 : montant, setPaymentStatus);

      // 2️⃣ Supprimer l’alerte et fermer AcceptModal
      removeAlertWithAnimation(alerte.id);
      setAcceptModal({ isOpen: false, alerte: null });

      // 3️⃣ Ouvrir le modal InProgress pour le solidaire
      setInProgressModal({ isOpen: true, report: reportData });

      toast.success("✅ Vous avez accepté d’aider !");

      // 4️⃣ Créer un chat pour ce report
      const chatRef = collection(db, "chats");
      await addDoc(chatRef, {
        reportId: alerte.reportId,
        participants: [user.uid, reportOwnerUid],
        messages: [],
        createdAt: new Date(),
      });
    } catch (err) {
      console.error("Erreur pricing :", err);
      toast.error("❌ Erreur lors du calcul des frais.");
    }
  };

  const rejectAlert = async (alerte) => {
    try {
      const reportRef = doc(db, "reports", alerte.reportId);
      const reportSnap = await getDoc(reportRef);

      if (reportSnap.exists()) await updateDoc(reportRef, { status: "aide refusée" });

      await deleteDoc(doc(db, "alertes", alerte.id));
      removeAlertWithAnimation(alerte.id);

      await updateDoc(doc(db, "users", user.uid), { status: "disponible" });
      await updateUserStatus(user.uid, "disponible", true, null);

      toast.info("❌ Vous avez rejeté l’alerte.");
    } catch (err) {
      console.error("Erreur rejet :", err);
      toast.error("❌ Une erreur est survenue lors du rejet.");
    }
  };

  const handleReleasePayment = async (reportId) => {
    // 🔹 Libérer le paiement via escrow
    await releaseEscrow(reportId, setPaymentStatus);
    setInProgressModal({ isOpen: false, report: null });
  };

  return (
    <div style={{ padding: "10px", background: "#fff3cd", borderRadius: "8px" }}>
      <h4>📢 Mes alertes reçues</h4>

      <AcceptModal
        isOpen={acceptModal.isOpen}
        onClose={() => setAcceptModal({ isOpen: false, alerte: null })}
        alerte={acceptModal.alerte}
        onConfirm={handleConfirmPricing}
      />

      <InProgressModal
        isOpen={inProgressModal.isOpen}
        onClose={() => setInProgressModal({ isOpen: false, report: null })}
        report={inProgressModal.report}
        solidaire={currentSolidaire}
        onComplete={handleReleasePayment}
      />

      <HelpBanner
        report={inProgressModal.report}
        onComplete={() => handleReleasePayment(inProgressModal.report?.id)}
      />

      {alerts.length === 0 ? (
        <p>Aucune alerte pour l’instant</p>
      ) : (
        <ul>
          {alerts.map((a) => (
            <div
              style={{
                border: "1px solid #ccc",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
                background: "#fff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)"
              }}
            >
              <h5>🚨 {a.ownerName || a.fromUid} a signalé : {a.nature || "Panne"}</h5>
              <p>📍 À {a.distance || "?"} km de vous</p>
              <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                <button onClick={() => setSelectedAlert(a)}>📍 Voir sur la carte</button>
                <button
                  style={{ background: "green", color: "#fff", padding: "6px 10px", borderRadius: "6px" }}
                  onClick={() => acceptAlert(a)}
                >
                  ✅ Accepter
                </button>
                <button
                  style={{ background: "red", color: "#fff", padding: "6px 10px", borderRadius: "6px" }}
                  onClick={() => rejectAlert(a)}
                >
                  ❌ Refuser
                </button>
              </div>
            </div>
          ))}
        </ul>
      )}
    </div>
  );
}
