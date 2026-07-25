import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCpospWEUbagXmHllr7yjsKiLYxndFZdck",
  authDomain: "transcript-application-system.firebaseapp.com",
  projectId: "transcript-application-system",
  storageBucket: "transcript-application-system.firebasestorage.app",
  messagingSenderId: "268782773894",
  appId: "1:268782773894:web:7f9d7b23dd59f83fdf5307",
  measurementId: "G-L16WLRMDR0",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
