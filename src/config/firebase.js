import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7A1jYRHQ3PbVR21wW7l6EXFOVN4pelj0",
  authDomain: "ca-with-shree-jii.firebaseapp.com",
  projectId: "ca-with-shree-jii",
  storageBucket: "ca-with-shree-jii.firebasestorage.app",
  messagingSenderId: "457044064641",
  appId: "1:457044064641:web:44959b02de451e0de2d080",
  measurementId: "G-GYE61R3S26"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
