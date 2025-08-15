// src/Auth.jsx
import React, { useState } from "react";
import { auth, db, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "./firebase";
import { TextField, Button, Snackbar, Alert, Box, Typography } from "@mui/material";

export default function Auth({ setUser, onBecomeSolidaire }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Exemple login
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      console.error(error);
    }
  };

  // Exemple signup
  const handleSignup = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Box>
      <Typography variant="h5">Connexion</Typography>
      <TextField label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <TextField type="password" label="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} />
      <Button onClick={handleLogin}>Se connecter</Button>
      <Button onClick={handleSignup}>Créer un compte</Button>
    </Box>
  );
}
