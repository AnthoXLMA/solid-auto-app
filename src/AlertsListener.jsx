import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function AlertsListener({ user }) {
  const [alerts, setAlerts] = useState([]);

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

  const acceptAlert = async (alert) => {
    try {
      // Mettre à jour l'alerte
      await updateDoc(doc(db, "alertes", alert.id), {
        status: "accepté"
      });

      // Mettre à jour le report
      await updateDoc(doc(db, "reports", alert.reportId), {
        status: "aide confirmée",
        helperUid: user.uid,
      });

      alert("✅ Vous avez accepté d’aider !");
    } catch (err) {
      console.error("Erreur acceptation :", err);
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
            <li key={a.id}>
              🚨 {a.fromUid} vous demande de l’aide (report: {a.reportId})
              <button
                style={{ marginLeft: "10px", cursor: "pointer" }}
                onClick={() => acceptAlert(a)}
              >
                ✅ Proposer mon aide
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
