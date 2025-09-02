// src/ReportsListener.jsx
import React, { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import PaymentBanner from "./PaymentBanner";
import HelpBanner from "./HelpBanner";
import { toast } from "react-toastify";

export default function ReportsListener({ user }) {
  const [myReports, setMyReports] = useState([]);
  const [activeReport, setActiveReport] = useState(null);

  // 🔔 Écoute les reports créés par ce user
  useEffect(() => {
    if (!user?.uid) return;

    const q = query(collection(db, "reports"), where("ownerUid", "==", user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const reports = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // tri : le plus récent en premier
      const sorted = reports.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setMyReports(sorted);

      // prend le dernier report actif
      const current = sorted.find(r => ["en attente", "attente séquestre", "en cours"].includes(r.status));
      setActiveReport(current || null);
    });

    return () => unsub();
  }, [user]);

  // 🔹 Callback après paiement
  const handlePaymentDone = async (reportId) => {
    try {
      const reportRef = doc(db, "reports", reportId);
      await updateDoc(reportRef, {
        status: "en cours",
        escrowStatus: "bloqué",
      });
      toast.success("✅ Paiement validé, dépannage en cours !");
    } catch (err) {
      console.error(err);
      toast.error("❌ Erreur lors de la validation du paiement.");
    }
  };

  return (
    <>
      {activeReport && activeReport.status === "attente séquestre" && (
        <PaymentBanner
          report={activeReport}
          onPaymentDone={() => handlePaymentDone(activeReport.id)}
        />
      )}

      {activeReport && activeReport.status === "en cours" && (
        <HelpBanner
          report={activeReport}
          onComplete={() => toast.info("ℹ️ Dépannage terminé.")}
        />
      )}
    </>
  );
}
