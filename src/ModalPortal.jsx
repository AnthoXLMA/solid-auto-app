// src/ModalPortal.jsx
import React from "react";
import ReactDOM from "react-dom";

export default function ModalPortal({ children, onClose }) {
  return ReactDOM.createPortal(
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
        zIndex: 9999,
      }}
      onClick={onClose} // ferme si on clique en dehors
    >
      <div
        style={{ background: "#fff", borderRadius: 12, padding: 20, minWidth: 300 }}
        onClick={(e) => e.stopPropagation()} // empêche la fermeture si on clique dedans
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
