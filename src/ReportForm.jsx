import React, { useState } from "react";

export default function ReportForm({ userPosition, onNewReport }) {
  const [showModal, setShowModal] = useState(false);
  const [nature, setNature] = useState("batterie");
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
      address: "Adresse inconnue", // tu peux rajouter un geocoder plus tard
    };

    onNewReport(newReport);
    setShowModal(false);
    setMessage("");
  };

  return (
    <>
      {/* Bouton qui ouvre la popup */}
      <button onClick={() => setShowModal(true)}>
        🚨 Signaler une panne
      </button>

      {/* Popup */}
      {showModal && (
  <div
    style={{
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000, // ✅ super important
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "10px",
        width: "300px",
        zIndex: 1001,
      }}
    >
      <h3>Type de panne</h3>
      <form onSubmit={handleSubmit}>
        <select value={nature} onChange={(e) => setNature(e.target.value)}>
          <option value="batterie">🔋 Batterie</option>
          <option value="pneu">🚗 Pneu crevé</option>
          <option value="carburant">⛽ Carburant</option>
        </select>

        <textarea
          placeholder="Ajoutez un message (optionnel)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ display: "block", marginTop: "10px", width: "100%" }}
        />

        <div style={{ marginTop: "10px", display: "flex", gap: "10px" }}>
          <button type="submit">Envoyer</button>
          <button type="button" onClick={() => setShowModal(false)}>
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
