// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDKneyTzL_hgQVuiQiXiy7hg12EMHM6o0Y",
  authDomain: "streamflow-e2a87.firebaseapp.com",
  projectId: "streamflow-e2a87",
  storageBucket: "streamflow-e2a87.firebasestorage.app",
  messagingSenderId: "236982985564",
  appId: "1:236982985564:web:04da524c6660b2af41d799",
  measurementId: "G-4673DRMX9B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
