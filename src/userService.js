// userService.js
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * Met à jour ou crée le doc utilisateur
 * @param {string} uid - UID Firebase Auth de l'utilisateur
 * @param {string} newStatus - ex: "disponible", "aide en cours", "indisponible"
 * @param {boolean} isOnline - true si l'utilisateur est connecté
 * @param {string|null} currentReport - id du report en cours ou null
 */
export async function updateUserStatus(uid, newStatus, isOnline, currentReport = null) {
  const userRef = doc(db, "users", uid);

  await setDoc(
    userRef,
    {
      status: newStatus,
      online: isOnline,
      currentReport: currentReport,
      updatedAt: new Date(),
    },
    { merge: true } // 👈 merge évite d’écraser les champs existants
  );
}
