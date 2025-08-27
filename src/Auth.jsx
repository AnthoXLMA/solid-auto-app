// src/Auth.jsx
import React, { useState } from "react";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "./firebase";
import {
  TextField,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  CircularProgress,
  Alert,
  Paper
} from "@mui/material";

export default function Auth({ setUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [materiel, setMateriel] = useState("pinces");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetFields = () => {
    setEmail("");
    setPassword("");
    setMateriel("pinces");
    setError("");
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser({
        ...userCredential.user,
        materiel,
      });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(to bottom, #f0f4f8, #d9e2ec)",
        p: 2,
      }}
    >
      <Paper elevation={6} sx={{ p: 4, maxWidth: 400, width: "100%", borderRadius: 3 }}>
        <Typography variant="h5" align="center" mb={2}>
          {isSignup ? "Créer un compte" : "Connexion"}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />
        <TextField
          label="Mot de passe"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
        />

        {isSignup && (
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Matériel disponible</InputLabel>
            <Select value={materiel} onChange={(e) => setMateriel(e.target.value)}>
              <MenuItem value="pinces">🔋 Pinces (Batterie)</MenuItem>
              <MenuItem value="cric">🛞 Cric (Pneu)</MenuItem>
              <MenuItem value="jerrican">⛽ Jerrican (Carburant)</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={isSignup ? handleSignup : handleLogin}
          disabled={loading}
          sx={{ py: 1.5, mb: 1 }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : isSignup ? "S'inscrire" : "Se connecter"}
        </Button>

        <Button
          variant="text"
          fullWidth
          onClick={() => {
            setIsSignup(!isSignup);
            resetFields();
          }}
        >
          {isSignup ? "Vous avez déjà un compte ? Se connecter" : "Pas encore de compte ? S'inscrire"}
        </Button>
      </Paper>
    </Box>
  );
}
