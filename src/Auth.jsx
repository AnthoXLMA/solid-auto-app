import React, { useState } from "react";
import {
  auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  db,
} from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  TextField,
  Button,
  Box,
  Typography,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Paper,
  Checkbox,
  ListItemText,
} from "@mui/material";
import zxcvbn from "zxcvbn";
import { PANNE_TYPES } from "./constants/pannes";
import { MATERIEL_OPTIONS } from "./constants/materiel";


export default function Auth({ setUser }) {
  const [mode, setMode] = useState("login"); // "login" ou "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [materiel, setMateriel] = useState([]); // tableau pour matériel multiple
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [pannes, setPannes] = useState([]); // tableau vide au départ

  const PANNE_OPTIONS = [
    { value: "pinces", label: "🔋 Pinces (Batterie)" },
    { value: "cric", label: "🛞 Cric (Pneu)" },
    { value: "jerrican", label: "⛽ Jerrican (Carburant)" },
  ];

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    setPasswordStrength(val ? zxcvbn(val).score : null);
  };

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion : " + error.message);
    }
  };

  const handleSignup = async () => {
    if (!username) {
      alert("Veuillez saisir un nom d'utilisateur.");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Créer document Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username,
        materiel, // maintenant tableau
        online: true,
        latitude: null,
        longitude: null,
      });

      setUser({
        ...user,
        username,
        materiel,
        isFirstLogin: true, // <-- flag ajouté
      });
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création de compte : " + error.message);
    }
    // Calcul automatique des pannes que l'utilisateur peut dépanner
    const pannes = materiel.flatMap((m) => {
      const matOption = MATERIEL_OPTIONS.find((o) => o.value === m);
      return matOption?.compatible || [];
    });
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

        {mode === "signup" && passwordStrength !== null && (
          <Box sx={{ mt: 1 }}>
            <Box sx={{ height: 8, borderRadius: 4, backgroundColor: "#eee", overflow: "hidden" }}>
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


{/*        {mode === "signup" && (
          <FormControl fullWidth>
            <InputLabel>Matériel disponible</InputLabel>
            <Select
              multiple
              value={materiel}
              onChange={(e) => setMateriel(e.target.value)}
              renderValue={(selected) =>
                selected
                  .map((val) => PANNE_OPTIONS.find((o) => o.value === val)?.label)
                  .join(", ")
              }
            >
              {PANNE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={materiel.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}}*/}


        {mode === "signup" && (
        <FormControl fullWidth>
          <InputLabel>Matériel disponible</InputLabel>
          <Select
            multiple
            value={materiel}
            onChange={(e) => setMateriel(e.target.value)}
            renderValue={(selected) =>
              selected
                .map((val) => MATERIEL_OPTIONS.find((o) => o.value === val)?.label)
                .join(", ")
            }
          >
            {MATERIEL_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                <Checkbox checked={materiel.includes(option.value)} />
                <ListItemText primary={option.label} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        )}


{/*        {mode === "signup" && (
          <FormControl fullWidth>
            <InputLabel>Pannes que vous pouvez dépanner</InputLabel>
            <Select
              multiple
              value={pannes}
              onChange={(e) => setPannes(e.target.value)}
              renderValue={(selected) =>
                selected
                  .map((val) => PANNE_TYPES.find((o) => o.value === val)?.label)
                  .join(", ")
              }
            >
              {PANNE_TYPES.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  <Checkbox checked={pannes.includes(option.value)} />
                  <ListItemText primary={option.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          )}*/}
        <Button
          variant="contained"
          onClick={mode === "login" ? handleLogin : handleSignup}
          fullWidth
        >
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </Button>

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
