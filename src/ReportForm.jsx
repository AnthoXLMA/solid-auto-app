import React, { useState } from "react";
import { PANNE_TYPES } from "./constants/pannes";

export default function ReportForm({ userPosition, onNewReport }) {
  const [showModal, setShowModal] = useState(false);
  const [nature, setNature] = useState(PANNE_TYPES[0].value);
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userPosition) return;

    const newReport = {
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature,
      message,
      status: "en-attente",
      address: "Adresse inconnue",
    };

    onNewReport(newReport);
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
          fontSize: "16px",
        }}
      >
        🚨 Signaler une panne
      </button>

      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: "20px",
              borderRadius: "12px",
              width: "360px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
              zIndex: 1001,
            }}
          >
            <h3 style={{ marginBottom: "15px", textAlign: "center" }}>
              Type de panne
            </h3>

            {/* Menu interactif flottant */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "12px",
                marginBottom: "15px",
              }}
            >
              {PANNE_TYPES.map((p) => {
                const selected = nature === p.value;
                return (
                  <div
                    key={p.value}
                    onClick={() => setNature(p.value)}
                    style={{
                      width: "80px",
                      height: "80px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "12px",
                      border: selected ? "2px solid #007bff" : "1px solid #ccc",
                      background: selected ? "#e6f0ff" : "#fff",
                      cursor: "pointer",
                      userSelect: "none",
                      textAlign: "center",
                      fontSize: "14px",
                      transition:
                        "all 0.2s ease, transform 0.15s ease-in-out, box-shadow 0.2s ease",
                      boxShadow: selected
                        ? "0 4px 12px rgba(0,123,255,0.3)"
                        : "0 2px 6px rgba(0,0,0,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow = "0 6px 14px rgba(0,0,0,0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = selected
                        ? "0 4px 12px rgba(0,123,255,0.3)"
                        : "0 2px 6px rgba(0,0,0,0.1)";
                    }}
                  >
                    <div style={{ fontSize: "28px", marginBottom: "5px" }}>
                      {p.icon}
                    </div>
                    <div>{p.label}</div>
                  </div>
                );
              })}
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                placeholder="Ajoutez un message (optionnel)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                style={{
                  display: "block",
                  marginBottom: "10px",
                  width: "100%",
                  padding: "6px",
                  borderRadius: "6px",
                  border: "1px solid #ccc",
                  resize: "vertical",
                }}
              />

              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    border: "none",
                    background: "#007bff",
                    color: "#fff",
                    cursor: "pointer",
                    fontWeight: "bold",
                  }}
                >
                  Envoyer
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
                    background: "#f8f9fa",
                    cursor: "pointer",
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
