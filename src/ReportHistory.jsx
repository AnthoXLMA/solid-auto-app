function ReportHistory({ report, alerts, solidaires }) {
  if (!report) return null;

  const reportAlerts = alerts.filter(a => a.reportId === report.id);

  return (
    <div
      style={{
        position: "absolute",
        bottom: 10,
        left: "50%",
        transform: "translateX(-50%)",
        background: "#fff",
        border: "1px solid #ccc",
        padding: "12px",
        borderRadius: "12px",
        zIndex: 1000,
        maxWidth: 300,
        fontSize: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)"
      }}
    >
      <strong>📄 Historique de la panne :</strong>
      <div>Nature : {report.nature}</div>
      {reportAlerts.length > 0 ? (
        <ul>
          {reportAlerts.map((a, i) => {
            const solidaire = solidaires.find(s => s.uid === a.toUid);
            return (
              <li key={i}>
                ⚡ Alerte envoyée à {solidaire?.name || a.toUid} - {new Date(a.timestamp?.toDate()).toLocaleTimeString()}
              </li>
            );
          })}
        </ul>
      ) : (
        <div>Pas encore d’alerte envoyée</div>
      )}
    </div>
  );
}
