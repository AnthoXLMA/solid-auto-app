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
import { toast } from "react-toastify";

export default function AlertsListener({ user, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);
  const [acceptModal, setAcceptModal] = useState({ isOpen: false, alerte: null });

  // 🔥 Mise à jour du statut du solidaire quand il est en ligne
  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);

    // par défaut il est dispo à la connexion
    updateDoc(userRef, { status: "disponible" }).catch(() => {});

    return () => {
      // à la déconnexion, on le met en "indisponible"
      updateDoc(userRef, { status: "indisponible" }).catch(() => {});
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "alertes"), where("toUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

      // ⚡️ si au moins une alerte en attente → statut "en attente de réponse"
      if (snapshot.docs.length > 0) {
        updateDoc(doc(db, "users", user.uid), { status: "en attente de réponse" }).catch(() => {});
      } else {
        updateDoc(doc(db, "users", user.uid), { status: "disponible" }).catch(() => {});
      }
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
      // ✅ statut passe en aide en cours dès acceptation
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

      // Récupérer le propriétaire du report pour le notifier
      const reportData = reportSnap.data();
      const reportOwnerUid = reportData.ownerUid;

      // 1️⃣ Mettre à jour la report et l'alerte
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(reportRef, {
        status: "aide en cours",
        helperUid: user.uid,
        frais: fraisAnnules ? 0 : montant,
      });

      // 2️⃣ Supprimer l'alerte et fermer le modal
      removeAlertWithAnimation(alerte.id);
      setAcceptModal({ isOpen: false, alerte: null });

      // 3️⃣ Notification toast côté solidaire et sinistré
      toast.success("✅ Vous avez accepté d’aider !");
      toast.info(
        `🚨 Solidaire en route pour vous aider. Montant du dépannage : ${
          fraisAnnules ? "0 €" : montant + " €"
        }`
      );

      // 4️⃣ Créer un chat pour le report si besoin
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

      if (reportSnap.exists()) {
        await updateDoc(reportRef, { status: "aide refusée" });
      }

      await deleteDoc(doc(db, "alertes", alerte.id));
      removeAlertWithAnimation(alerte.id);

      // ⛔️ Rejet → retour au statut dispo
      await updateDoc(doc(db, "users", user.uid), { status: "disponible" });

      toast.info("❌ Vous avez rejeté l’alerte.");
    } catch (err) {
      console.error("Erreur rejet :", err);
      toast.error("❌ Une erreur est survenue lors du rejet.");
    }
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
