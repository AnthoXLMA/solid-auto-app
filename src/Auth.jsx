import React, { useState } from "react";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "./firebase-auth";
import { TextField, Button, Snackbar, Alert, Box, Typography } from "@mui/material";

export default function Auth({ setUser, onBecomeSolidaire }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userLocal, setUserLocal] = useState(null);
  const [alert, setAlert] = useState({ open: false, message: "", severity: "info" });

  const showAlert = (message, severity = "info") => {
    setAlert({ open: true, message, severity });
  };

  const validateForm = () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      showAlert("Veuillez entrer un e-mail valide", "error");
      return false;
    }
    if (!password) {
      showAlert("Veuillez entrer un mot de passe", "error");
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUserLocal(userCredential.user);
      setUser(userCredential.user);
      showAlert("Compte créé avec succès ✅", "success");
    } catch (error) {
      showAlert(error.message, "error");
    }
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUserLocal(userCredential.user);
      setUser(userCredential.user);
      showAlert("Connexion réussie ✅", "success");
    } catch (error) {
      showAlert(error.message, "error");
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUserLocal(null);
    setUser(null);
    showAlert("Déconnecté", "info");
  };

  const handleBecomeSolidaire = () => {
    if (userLocal && onBecomeSolidaire) {
      const solidaire = {
        email: userLocal.email,
        latitude: 48.8566,
        longitude: 2.3522,
        materiel: "pinces",
      };
      onBecomeSolidaire(solidaire);
      showAlert("Vous êtes maintenant un automobiliste solidaire ✅", "success");
    }
  };

  return (
    <>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2, maxWidth: 400 }}>
        {!userLocal ? (
          <>
            <Typography variant="h6">Connexion / Inscription</Typography>
            <TextField
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
            />
            <TextField
              type="password"
              label="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
            />
            <Button variant="contained" onClick={handleSignUp}>Créer un compte</Button>
            <Button variant="outlined" onClick={handleSignIn}>Se connecter</Button>
          </>
        ) : (
          <>
            <Typography variant="body1">
              Connecté en tant que : <strong>{userLocal.email}</strong>
            </Typography>
            <Button variant="contained" onClick={handleBecomeSolidaire} sx={{ mb: 1 }}>
              Devenir automobiliste solidaire
            </Button>
            <Button variant="contained" color="error" onClick={handleSignOut}>
              Se déconnecter
            </Button>
          </>
        )}
      </Box>

      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={alert.severity} onClose={() => setAlert((prev) => ({ ...prev, open: false }))}>
          {alert.message}
        </Alert>
      </Snackbar>
    </>
  );
}
