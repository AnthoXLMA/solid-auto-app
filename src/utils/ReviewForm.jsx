// components/ReviewForm.jsx
import React, { useState } from "react";
import { Box, TextField, Button, Typography, Rating } from "@mui/material";
import { leaveReview } from "../functions/leaveReview";

export default function ReviewForm({ fromUid, toUid, reportId, onSuccess }) {
  const [note, setNote] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (note === 0) {
      alert("Veuillez donner une note");
      return;
    }

    setLoading(true);
    try {
      await leaveReview({ fromUid, toUid, reportId, note, comment });
      setNote(0);
      setComment("");
      if (onSuccess) onSuccess(); // callback optionnel pour fermer le formulaire ou recharger
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'envoi de l'avis : " + error.message);
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: 2, border: "1px solid #ccc", borderRadius: 2, bgcolor: "#fafafa" }}>
      <Typography variant="h6" gutterBottom>Rédiger un avis</Typography>
      <Rating
        name="note"
        value={note}
        onChange={(e, val) => setNote(val)}
      />
      <TextField
        label="Commentaire (optionnel)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        multiline
        rows={3}
        fullWidth
        sx={{ mt: 2 }}
      />
      <Button
        variant="contained"
        sx={{ mt: 2 }}
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Envoi..." : "Envoyer l'avis"}
      </Button>
    </Box>
  );
}
