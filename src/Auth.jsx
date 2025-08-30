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
import { MATERIEL_OPTIONS } from "./constants/materiel";

// --- Helper pour calculer le score et le niveau ---
const calculateScore = (expertise_materiel, points_experience = 0, avis = []) => {
  const matScore = Object.values(expertise_materiel).reduce((sum, val) => sum + (val ? 20 : 0), 0);
  const experienceScore = points_experience;
  const avisScore = avis.length > 0 ? avis.reduce((a, b) => a + b.note, 0) / avis.length * 20 : 0;
  const score_global = Math.round(0.4 * matScore + 0.4 * experienceScore + 0.2 * avisScore);

  let niveau = "Débutant 🌱";
  if (score_global > 30) niveau = "Intermédiaire ⚡";
  if (score_global > 60) niveau = "Expert 🔥";
  if (score_global > 85) niveau = "Expert confirmé 🏆";

  return { score_global, niveau };
};

export default function Auth({ setUser }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [materiel, setMateriel] = useState([]);
  const [passwordStrength, setPasswordStrength] = useState(null);
  const [role, setRole] = useState("");

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

      // Créer l'objet expertise_materiel
      const expertise_materiel = MATERIEL_OPTIONS.reduce((acc, o) => {
        acc[o.value] = materiel.includes(o.value);
        return acc;
      }, {});

      // Calcul du score initial et niveau
      const { score_global, niveau } = calculateScore(expertise_materiel);

      // Création du document Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username,
        materiel,
        expertise_materiel,
        points_experience: 0,
        avis: [],
        score_global,
        niveau,
        badges: [],
        role, // rôle choisi
        online: true,
        latitude: null,
        longitude: null,
        hasSeenFirstPanneModal: false, // <--- clé importante
      });

      setUser({
        ...user,
        username,
        materiel,
        expertise_materiel,
        score_global,
        niveau,
        isFirstLogin: true,
        hasSeenFirstPanneModal: false,
      });

    } catch (error) {
      console.error(error);
      alert("Erreur lors de la création de compte : " + error.message);
    }
  };

  const ROLES = [
    {
      value: "automobiliste_equipe",
      label: "Automobiliste",
      description: "Automobiliste occasionnel, en capacité de dépanner avec un matériel de première nécessité."
    },
    {
      value: "automobiliste_intervenant_confirme",
      label: "Dépanneur Occasionnel",
      description: "Dépanneur occasionnel, capable d’intervenir régulièrement avec une bonne connaissance mécanique."
    },
    {
      value: "professionnel_expert_certifie",
      label: "Professionnel Certifié",
      description: "Professionnel du milieu automobile (garagiste, dépanneur reconnu, services agréés)."
    }
  ];

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

        {mode === "signup" && (
          <FormControl fullWidth>
            <InputLabel>Rôle</InputLabel>
            <Select
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  {r.label}
                </MenuItem>
              ))}
            </Select>
            {role && (
              <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                {ROLES.find((r) => r.value === role)?.description}
              </Typography>
            )}
          </FormControl>
        )}

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
