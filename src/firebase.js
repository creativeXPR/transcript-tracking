// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCpospWEUbagXmHllr7yjsKiLYxndFZdck",
  authDomain: "transcript-application-system.firebaseapp.com",
  projectId: "transcript-application-system",
  storageBucket: "transcript-application-system.firebasestorage.app",
  messagingSenderId: "268782773894",
  appId: "1:268782773894:web:7f9d7b23dd59f83fdf5307",
  measurementId: "G-L16WLRMDR0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);