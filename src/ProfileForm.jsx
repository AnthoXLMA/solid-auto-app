// src/ProfileForm.jsx
import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { Box, TextField, Button, Select, MenuItem, InputLabel, FormControl, Typography } from "@mui/material";
import { toast } from "react-toastify";

export default function ProfileForm({ user, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [materiel, setMateriel] = useState("");

  // Chargement des données Firestore
  useEffect(() => {
    if (!user) return;

    setEmail(user.email);
    const fetchUserData = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setName(data.name || "");
        setMateriel(data.materiel || "");
      }
    };
    fetchUserData();
  }, [user]);

  // Sauvegarde des modifications
  const handleSave = async () => {
    if (!name || !materiel) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    try {
      const docRef = doc(db, "users", user.uid);
      await updateDoc(docRef, { name, materiel });
      toast.success("Profil mis à jour ✅");
      onClose();
    } catch (error) {
      console.error("Erreur lors de la mise à jour du profil:", error);
      toast.error("Erreur lors de la mise à jour du profil");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Box
        sx={{
          bgcolor: "white",
          p: 4,
          borderRadius: 2,
          maxWidth: 400,
          width: "100%",
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, textAlign: "center" }}>
          Modifier mon profil
        </Typography>

        <TextField
          fullWidth
          label="Nom *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 2 }}
          required
        />

        <TextField
          fullWidth
          label="Email"
          value={email}
          disabled
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Matériel disponible *</InputLabel>
          <Select value={materiel} onChange={(e) => setMateriel(e.target.value)} required>
            <MenuItem value="pinces">🔋 Pinces (Batterie)</MenuItem>
            <MenuItem value="cric">🛞 Cric (Pneu)</MenuItem>
            <MenuItem value="jerrican">⛽ Jerrican (Carburant)</MenuItem>
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
          <Button variant="outlined" onClick={onClose} fullWidth sx={{ mr: 1 }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!name || !materiel}
            fullWidth
            sx={{ ml: 1 }}
          >
            Enregistrer
          </Button>
        </Box>
      </Box>
    </div>
  );
}
