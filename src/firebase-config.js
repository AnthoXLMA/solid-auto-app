// firebase-config.js
import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyAvFJKhrcSDihTeaj8-TOoT4OGa8LLZMgs",
  authDomain: "solid-auto-app.firebaseapp.com",
  projectId: "solid-auto-app",
  storageBucket: "solid-auto-app.firebasestorage.app",
  messagingSenderId: "426682491348",
  appId: "1:426682491348:web:01ad866400f25ceede3641",
  measurementId: "G-0Y6Q6DK0QE"
};

const app = initializeApp(firebaseConfig);

export default app;
