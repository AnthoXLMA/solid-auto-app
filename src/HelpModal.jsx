import React, { useState } from "react";

export default function HelpModal({ isOpen, onClose, distance, tarifKm }) {
  const [cancelFees, setCancelFees] = useState(false);

  if (!isOpen) return null;

  const fraisKm = distance * tarifKm;
  const commission = fraisKm * 0.1;
  const montantTotal = cancelFees ? 0 : fraisKm + commission;

  return (
    <div style={{
      position: "fixed",
      top: 0, left: 0,
      width: "100%", height: "100%",
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000
    }}>
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "8px", minWidth: "300px" }}>
        <h2>Calcul des frais du dépannage</h2>
        <p>Distance : {distance} km</p>
        <p>Frais kilométriques : {fraisKm.toFixed(2)} €</p>
        <p>Commission : {commission.toFixed(2)} €</p>
        <div>
          <label>
            <input
              type="checkbox"
              checked={cancelFees}
              onChange={() => setCancelFees(!cancelFees)}
            />
            Annuler les frais
          </label>
        </div>
        <h3>Montant total : {montantTotal.toFixed(2)} €</h3>
        <button onClick={onClose} style={{ marginTop: "10px" }}>Valider</button>
      </div>
    </div>
  );
}
