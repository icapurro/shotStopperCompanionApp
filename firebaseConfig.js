// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyARPcipOGp3051nFVRPEoiQZKhNpvEThN4",
  authDomain: "shotstoppercompanion.firebaseapp.com",
  projectId: "shotstoppercompanion",
  storageBucket: "shotstoppercompanion.firebasestorage.app",
  messagingSenderId: "551602871959",
  appId: "1:551602871959:web:3e41a3a799843829a053d2",
  measurementId: "G-WEFZ3WEP5G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
