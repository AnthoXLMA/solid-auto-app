// src/Auth.jsx
import React, { useState } from "react";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./firebase";
import { TextField, Button, Box, Typography, Select, MenuItem, InputLabel, FormControl, Paper } from "@mui/material";
import zxcvbn from "zxcvbn";

export default function Auth({ setUser }) {
  const [mode, setMode] = useState("login"); // "login" ou "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState(""); // 🔹 Nom utilisateur
  const [materiel, setMateriel] = useState("pinces"); // 🔹 Matériel disponible
  const [passwordStrength, setPasswordStrength] = useState(null);

  // Gestion de la saisie mot de passe
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (val) {
      const strength = zxcvbn(val).score;
      setPasswordStrength(strength);
    } else {
      setPasswordStrength(null);
    }
  };

  // Connexion
  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion : " + error.message);
    }
  };

  // Inscription
  const handleSignup = async () => {
    if (!username) {
      alert("Veuillez saisir un nom d'utilisateur.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser({
        ...userCredential.user,
        username,
        materiel,
      });
      // 🔹 Ici on pourrait stocker username et materiel dans Firestore si besoin
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création de compte : " + error.message);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f0f2f5",
        p: 2,
      }}
    >
      <Paper sx={{ p: 4, width: 320, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" align="center" gutterBottom>
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </Typography>

        {mode === "signup" && (
          <TextField
            label="Nom d'utilisateur"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={handlePasswordChange}
        />

        {/* Barre de force du mot de passe */}
        {mode === "signup" && passwordStrength !== null && (
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: "#eee",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  width: `${(passwordStrength + 1) * 20}%`,
                  height: "100%",
                  backgroundColor:
                    passwordStrength < 2
                      ? "red"
                      : passwordStrength === 2
                      ? "orange"
                      : "green",
                  transition: "width 0.3s",
                }}
              />
            </Box>
            <Typography variant="caption" color="textSecondary">
              {["Très faible", "Faible", "Moyen", "Fort", "Très fort"][passwordStrength]}
            </Typography>
          </Box>
        )}

        {mode === "signup" && (
          <FormControl fullWidth>
            <InputLabel>Matériel disponible</InputLabel>
            <Select value={materiel} onChange={(e) => setMateriel(e.target.value)}>
              <MenuItem value="pinces">🔋 Pinces (Batterie)</MenuItem>
              <MenuItem value="cric">🛞 Cric (Pneu)</MenuItem>
              <MenuItem value="jerrican">⛽ Jerrican (Carburant)</MenuItem>
            </Select>
          </FormControl>
        )}

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="contained"
            onClick={mode === "login" ? handleLogin : handleSignup}
            fullWidth
          >
            {mode === "login" ? "Se connecter" : "Créer un compte"}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 1 }}>
          {mode === "login" ? (
            <>
              Pas de compte ?{" "}
              <Button variant="text" onClick={() => setMode("signup")}>
                Inscrivez-vous
              </Button>
            </>
          ) : (
            <>
              Déjà inscrit ?{" "}
              <Button variant="text" onClick={() => setMode("login")}>
                Connectez-vous
              </Button>
            </>
          )}
        </Typography>
      </Paper>
    </Box>
  );
}
