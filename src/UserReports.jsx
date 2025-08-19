import React from "react";

export default function UserReports({ userReports, users }) {
  // 🔹 Si pas de pannes actives
  if (!userReports || userReports.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-bold mb-4">📋 Mes demandes</h3>
        <div className="text-gray-500 italic">
          Aucune panne en cours 🚗✅
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xl font-bold mb-4">📋 Mes demandes</h3>
      <div style={{ display: "grid", gap: "12px" }}>
        {userReports.map((r) => {
          // Définir le statut visuel
          let statusLabel, statusColor, statusIcon, bgColor;
          switch (r.status) {
            case "en-attente":
            case "en attente":
              statusLabel = "En attente d’un solidaire";
              statusColor = "#d97706";
              bgColor = "#fef3c7";
              statusIcon = "⏳";
              break;
            case "alerté":
            case "aide en cours":
              statusLabel = "Solidaire alerté / Aide en cours";
              statusColor = "#2563eb";
              bgColor = "#dbeafe";
              statusIcon = "📞";
              break;
            case "aide confirmée":
              statusLabel = "Aide confirmée";
              statusColor = "#16a34a";
              bgColor = "#dcfce7";
              statusIcon = "✅";
              break;
            case "aide refusée":
              statusLabel = "Aide refusée";
              statusColor = "#dc2626";
              bgColor = "#fee2e2";
              statusIcon = "❌";
              break;
            case "annulé":
              statusLabel = "Demande annulée";
              statusColor = "#dc2626";
              bgColor = "#fee2e2";
              statusIcon = "❌";
              break;
            default:
              statusLabel = "Statut inconnu";
              statusColor = "#6b7280";
              bgColor = "#f3f4f6";
              statusIcon = "⚪";
          }

          // Trouver le nom du solidaire aidant
          const helper = users?.find((u) => u.uid === r.helperUid);

          return (
            <div
              key={r.id}
              style={{
                background: bgColor,
                borderRadius: "12px",
                padding: "15px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "600" }}>
                🚨 {r.nature || r.description || "Demande"}
              </div>

              <div
                style={{
                  marginTop: "6px",
                  color: statusColor,
                  fontWeight: "bold",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ fontSize: "18px" }}>{statusIcon}</span>
                {statusLabel}
              </div>

              {helper && (
                <div style={{ marginTop: "4px", fontSize: "14px", color: "#374151" }}>
                  👤 Solidaire: {helper.name || helper.uid}
                </div>
              )}

              {r.timestamp && (
                <div style={{ marginTop: "2px", fontSize: "12px", color: "#6b7280" }}>
                  🕒 {new Date(r.timestamp.seconds * 1000).toLocaleString()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
