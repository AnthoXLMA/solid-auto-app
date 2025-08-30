import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { useState } from "react";
import { Rating, TextField, Button } from "@mui/material";

export default function LeaveReview({ fromUid, toUid, reportId }) {
  const [note, setNote] = useState(0);
  const [comment, setComment] = useState("");

  const handleSubmit = async () => {
    if (!note) {
      alert("Merci de mettre une note");
      return;
    }

    await addDoc(collection(db, "reviews"), {
      fromUid,
      toUid,
      reportId,
      note,
      comment,
      createdAt: serverTimestamp(),
    });

    alert("Avis envoyé !");
    setNote(0);
    setComment("");
  };

  return (
    <div>
      <Rating value={note} onChange={(e, newValue) => setNote(newValue)} />
      <TextField
        label="Votre commentaire"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        fullWidth
        multiline
        rows={3}
        sx={{ my: 2 }}
      />
      <Button variant="contained" onClick={handleSubmit}>
        Envoyer
      </Button>
    </div>
  );
}
