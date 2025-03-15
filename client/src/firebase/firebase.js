import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDhZlhcRCIfAbT1QG_zG7Pe9TvEjVWRIpg",
    authDomain: "language-audio-app.firebaseapp.com",
    projectId: "language-audio-app",
    storageBucket: "language-audio-app.firebasestorage.app",
    messagingSenderId: "666485569369",
    appId: "1:666485569369:web:545f1dc60cc48394e3be48",
    measurementId: "G-4XW1CXGJQ3"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };