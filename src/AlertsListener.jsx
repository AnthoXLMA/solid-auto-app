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

export default function AlertsListener({ user, currentSolidaire, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });
  const [inProgressModal, setInProgressModal] = useState({ isOpen: false, report: null });

  // 🔥 Mise à jour du statut du solidaire quand il est en ligne
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    updateDoc(userRef, { status: "disponible" }).catch(() => {});
    return () => updateDoc(userRef, { status: "indisponible" }).catch(() => {});
  }, [user]);

  // 🔔 Écoute des alertes pour le solidaire
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

      // Supprimer alerte et fermer AcceptModal
      removeAlertWithAnimation(alerte.id);
      setAcceptModal({ isOpen: false, alerte: null });

      // Ouvrir InProgressModal pour le solidaire
      setInProgressModal({ isOpen: true, report: reportData });

      toast.success("✅ Vous avez accepté d’aider !");

      // Créer chat pour ce report
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
    // 🔹 Ici, on pourrait appeler releaseEscrow(reportId)
    console.log("💸 Paiement libéré pour report :", reportId);
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
              <button style={{ marginLeft: "10px" }} onClick={() => acceptAlert(a)}>
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
