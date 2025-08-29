import { MATERIEL_OPTIONS } from "../constants/materiel";

export function findHelpers(solidaires, activeReport, alerts, currentUserUid) {
  if (!activeReport) return solidaires; // ✅ garder tous si pas de report

  return solidaires.filter((s) => {
    const isOffline = !s.online;

    // Toujours un tableau
    const solidaireMateriel = Array.isArray(s.materiel)
      ? s.materiel
      : typeof s.materiel === "string"
      ? [s.materiel]
      : [];

    // Compatibilité panne / matériel
    const hasCompatibleMateriel =
      Boolean(activeReport.nature) &&
      solidaireMateriel.some((m) => {
        const matOption = MATERIEL_OPTIONS.find((o) => o.value === m);
        return matOption?.compatible?.includes(activeReport.nature);
      });

    // Déjà alerté ?
    const alertForSolidaire = alerts.some(
      (a) => a.reportId === activeReport.id && a.toUid === s.uid
    );

    return (
      s.uid !== currentUserUid && // ne pas s’alerter soi-même
      ((hasCompatibleMateriel && !isOffline) || alertForSolidaire)
    );
  });
}
