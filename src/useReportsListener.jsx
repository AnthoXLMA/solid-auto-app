import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { toast } from "react-toastify";

export default function useReportsListener(user) {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    if (!user) {
      setReports([]); // on vide les rapports si pas d'utilisateur
      return;
    }

    const q = query(
      collection(db, "reports"),
      where("ownerUid", "==", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const updatedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReports(updatedReports);

      updatedReports.forEach(r => {
        // Notification si aide confirmée et pas déjà notifié
        if (r.status === "aide confirmée" && !r.notified) {
          toast.success(`✅ Votre demande d'aide est prise en charge par ${r.helperUid}`, {
            position: "top-right",
            autoClose: 5000,
            hideProgressBar: false,
            pauseOnHover: true,
            draggable: true,
            theme: "colored",
          });

          // Marquer comme notifié
          updateDoc(doc(db, "reports", r.id), { notified: true });
        }
      });
    });

    return () => unsub();
  }, [user]);

  return reports;
}
