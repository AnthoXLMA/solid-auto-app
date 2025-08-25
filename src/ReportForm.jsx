import React, { useState } from "react";
import { PANNE_TYPES } from "./constants/pannes";
import ModalPortal from "./ModalPortal";

export default function ReportForm({ userPosition, onNewReport }) {
  const [showModal, setShowModal] = useState(false);
  const [nature, setNature] = useState(PANNE_TYPES[0].value);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPosition) return;

    onNewReport({
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature,
      message,
      status: "en-attente",
      address: "Adresse inconnue",
    });

    setShowModal(false);
    setMessage("");
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          background: "#007bff",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        🚨 Signaler une panne
      </button>

      {showModal && (
        <ModalPortal onClose={() => setShowModal(false)}>
          <h3 style={{ textAlign: "center" }}>Type de panne</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 15 }}>
            {PANNE_TYPES.map((p) => (
              <div
                key={p.value}
                onClick={() => setNature(p.value)}
                style={{
                  width: 80,
                  height: 80,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 12,
                  border: nature === p.value ? "2px solid #007bff" : "1px solid #ccc",
                  background: nature === p.value ? "#e6f0ff" : "#fff",
                  cursor: "pointer",
                  userSelect: "none",
                  textAlign: "center",
                  fontSize: 14,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 5 }}>{p.icon}</div>
                <div>{p.label}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <textarea
              placeholder="Ajoutez un message (optionnel)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ display: "block", width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ccc", marginBottom: 10 }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" style={{ flex: 1, padding: 8, borderRadius: 6, border: "none", background: "#007bff", color: "#fff" }}>
                Envoyer
              </button>
              <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc", background: "#f8f9fa" }}>
                Annuler
              </button>
            </div>
          </form>
        </ModalPortal>
      )}
    </>
  );
}
