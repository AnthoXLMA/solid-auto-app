import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import "./AlertsListener.css"; // fichier CSS pour l'animation

export default function AlertsListener({ user, setSelectedAlert }) {
  const [alerts, setAlerts] = useState([]);
  const [removingIds, setRemovingIds] = useState([]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "alertes"),
      where("toUid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsub();
  }, [user]);

  const removeAlertWithAnimation = (id) => {
    setRemovingIds(prev => [...prev, id]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
      setRemovingIds(prev => prev.filter(rid => rid !== id));
    }, 300); // correspond à la durée de l'animation CSS
  };

  const acceptAlert = async (alerte) => {
    try {
      await updateDoc(doc(db, "alertes", alerte.id), { status: "accepté" });
      await updateDoc(doc(db, "reports", alerte.reportId), { status: "aide confirmée", helperUid: user.uid });

      removeAlertWithAnimation(alerte.id);

      window.alert("✅ Vous avez accepté d’aider !");
    } catch (err) {
      console.error("Erreur acceptation :", err);
      window.alert("❌ Une erreur est survenue lors de l’acceptation.");
    }
  };

  const rejectAlert = async (alerte) => {
    try {
      // Supprime l'alerte dans Firestore
      await deleteDoc(doc(db, "alertes", alerte.id));

      // Optionnel : mettre à jour le report si nécessaire
      await updateDoc(doc(db, "reports", alerte.reportId), { status: "aide refusée" });

      removeAlertWithAnimation(alerte.id);

      window.alert("❌ Vous avez rejeté l’alerte.");
    } catch (err) {
      console.error("Erreur rejet :", err);
      window.alert("❌ Une erreur est survenue lors du rejet.");
    }
  };

  return (
    <div style={{ padding: "10px", background: "#fff3cd", borderRadius: "8px" }}>
      <h4>📢 Mes alertes reçues</h4>
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
              <button onClick={() => setSelectedAlert(a)}>
                📍 Géolocaliser l’alerte
              </button>

              <button
                style={{ marginLeft: "10px", cursor: "pointer" }}
                onClick={() => acceptAlert(a)}
              >
                ✅ Proposer mon aide
              </button>
              <button
                style={{ marginLeft: "5px", cursor: "pointer", backgroundColor: "#f8d7da", border: "none" }}
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
