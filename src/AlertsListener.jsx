import React, { useEffect } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { toast } from "react-toastify";

export default function AlertsListener({ user }) {
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(collection(db, "alertes"), (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const alertData = change.doc.data();
        if (
          change.type === "added" &&
          alertData.toUid === user.uid &&
          alertData.status === "envoyée"
        ) {
          toast.info(`⚡ Nouvelle alerte pour ${alertData.reportId} !`);
        }
      });
    });

    return () => unsub();
  }, [user]);

  return null; // Ce composant n'affiche rien
}
