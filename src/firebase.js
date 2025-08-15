// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ⚠️ Mets ici tes vraies clés Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAvFJKhrcSDihTeaj8-TOoT4OGa8LLZMgs",
  authDomain: "solid-auto-app.firebaseapp.com",
  projectId: "solid-auto-app",
  storageBucket: "solid-auto-app.appspot.com",
  messagingSenderId: "426682491348",
  appId: "1:426682491348:web:01ad866400f25ceede3641"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// Services Firebase
const auth = getAuth(app);
const db = getFirestore(app);

// Exports
export {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
};
