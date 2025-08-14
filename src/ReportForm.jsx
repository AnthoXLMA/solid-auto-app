import React, { useState } from "react";
import { TextField, Button, Box } from "@mui/material";

export default function ReportForm({ userPosition, onNewReport }) {
  const [message, setMessage] = useState("Plus de batterie, cherche des pinces");

  const handleSubmit = () => {
    if (!message) return;
    const newReport = {
      latitude: userPosition[0],
      longitude: userPosition[1],
      nature: "batterie",
      message,
      status: "en-attente",
      address: "Adresse non définie",
    };
    onNewReport(newReport);
    setMessage("");
  };

  return (
    <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1, maxWidth: 400 }}>
      <TextField
        label="Message de la panne"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        fullWidth
      />
      <Button variant="contained" onClick={handleSubmit}>Signaler la panne</Button>
    </Box>
  );
}
