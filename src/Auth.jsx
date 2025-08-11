// auth.js
import React, { useState } from "react";
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "./firebase-auth";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState(null);

  const handleSignUp = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      alert("Compte créé !");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignIn = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUser(userCredential.user);
      alert("Connecté !");
    } catch (error) {
      alert(error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setUser(null);
    alert("Déconnecté");
  };

  return (
    <div>
      {!user ? (
        <>
          <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
          <input type="password" placeholder="Mot de passe" onChange={(e) => setPassword(e.target.value)} />
          <button onClick={handleSignUp}>Créer un compte</button>
          <button onClick={handleSignIn}>Se connecter</button>
        </>
      ) : (
        <>
          <p>Connecté en tant que : {user.email}</p>
          <button onClick={handleSignOut}>Se déconnecter</button>
        </>
      )}
    </div>
  );
}
