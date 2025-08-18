// src/Auth.jsx
import React, { useState } from "react";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./firebase";
import { TextField, Button, Box, Typography, Select, MenuItem, InputLabel, FormControl } from "@mui/material";

export default function Auth({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materiel, setMateriel] = useState("pinces"); // 🔹 nouveau

  // Connexion
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user); // login normal
    } catch (error) {
      console.error(error);
    }
  };

  // Inscription
  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // 🔹 On attache aussi le matériel choisi
      setUser({
        ...userCredential.user,
        materiel, // on garde l'info pour App.jsx
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, width: "300px" }}>
      <Typography variant="h5">Connexion / Inscription</Typography>

      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField type="password" label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />

      {/* 🔹 Sélection du matériel uniquement visible à l'inscription */}
      <FormControl>
        <InputLabel>Matériel disponible</InputLabel>
        <Select value={materiel} onChange={(e) => setMateriel(e.target.value)}>
          <MenuItem value="pinces">🔋 Pinces (Batterie)</MenuItem>
          <MenuItem value="cric">🛞 Cric (Pneu)</MenuItem>
          <MenuItem value="jerrican">⛽ Jerrican (Carburant)</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button variant="contained" onClick={handleLogin}>
          Se connecter
        </Button>
        <Button variant="outlined" onClick={handleSignup}>
          Créer un compte
        </Button>
      </Box>
    </Box>
  );
}
